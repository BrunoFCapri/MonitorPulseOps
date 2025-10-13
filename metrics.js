// api/metrics.js
// Handler minimal para Vercel: acepta POST JSON en /api/metrics y GET para obtener último valor (memoria, no persistente)

let last = null;

export default async function handler(req, res) {
  const API_KEY = process.env.METRICS_API_KEY || null;

  if (API_KEY) {
    const key = (req.headers['x-api-key'] || '');
    if (key !== API_KEY) {
      return res.status(401).json({ error: 'invalid api key' });
    }
  }

  if (req.method === 'POST') {
    const body = req.body || null;
    if (!body) return res.status(400).json({ error: 'invalid json' });
    last = { received_at: Date.now(), payload: body };
    console.log('Received metrics:', body);
    return res.status(201).json({ status: 'ok' });
  } else if (req.method === 'GET') {
    return res.status(200).json(last || { status: 'no-data' });
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}
