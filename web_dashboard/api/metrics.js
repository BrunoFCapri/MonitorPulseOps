// Public, tokenless metrics API (in-memory; resets on cold starts)
// Store latest payload per deviceId. Falls back to legacy lastPayload for compatibility.
let lastPayload = null;
let devices = {}; // { [deviceId: string]: { payload: any, receivedAt: string } }

function getDeviceIdFrom(payload, req) {
  const fromBody = payload && (payload.device_id || payload.deviceId || payload.context?.platform_info?.node_name);
  const fromHeader = req.headers['x-device-id'];
  const fromQuery = req.query?.device;
  return (fromBody || fromHeader || fromQuery || 'unknown').toString();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'POST') {
    try {
      const payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid JSON' });

      // Determine deviceId and store per device
      const deviceId = getDeviceIdFrom(payload, req);
      devices[deviceId] = { payload, receivedAt: new Date().toISOString() };

      // Maintain legacy lastPayload for single-device clients
      lastPayload = payload;
      return res.status(200).json({ ok: true, device: deviceId });
    } catch (_) {
      return res.status(400).json({ error: 'Bad JSON' });
    }
  }

  if (req.method === 'GET') {
    const q = req.query || {};
    const deviceParam = q.device;
    const ids = Object.keys(devices);

    if (deviceParam) {
      const entry = devices[deviceParam];
      if (entry) return res.status(200).json(entry.payload);
      // Fallback: if no entry but we have lastPayload, return it
      if (lastPayload) return res.status(200).json(lastPayload);
      return res.status(404).json({ error: 'Device not found', device: deviceParam });
    }

    // No device specified
    if (ids.length === 0) {
      // Return legacy last payload if available or a helpful message
      return res.status(200).json(lastPayload || { context: { message: 'No data posted yet' } });
    }
    if (ids.length === 1) {
      return res.status(200).json(devices[ids[0]].payload);
    }

    // Multiple devices available: return list to let clients choose
    const brief = ids.map(id => ({
      id,
      receivedAt: devices[id].receivedAt,
      node: devices[id].payload?.context?.platform_info?.node_name || id,
      os: devices[id].payload?.context?.platform_info?.os_name || 'unknown',
    }));
    return res.status(200).json({ devices: brief });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };