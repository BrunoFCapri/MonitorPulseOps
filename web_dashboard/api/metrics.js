export const config = { runtime: 'edge' };

const KEY = 'web_dashboard:metrics:last';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store',
  };
}

async function persist(data) {
  // Intentar usar Vercel KV si está configurado
  try {
    if (process.env.KV_URL || process.env.KV_REST_API_URL) {
      const { kv } = await import('@vercel/kv');
      await kv.set(KEY, data, { ex: 600 }); // 10 minutos
      return true;
    }
  } catch (_) {}

  // Fallback in-memory (no persistente entre instancias)
  globalThis.__WB_LAST_METRICS__ = data;
  return true;
}

async function retrieve() {
  try {
    if (process.env.KV_URL || process.env.KV_REST_API_URL) {
      const { kv } = await import('@vercel/kv');
      const val = await kv.get(KEY);
      if (val) return val;
    }
  } catch (_) {}
  return globalThis.__WB_LAST_METRICS__ || null;
}

export default async function handler(req) {
  const hdrs = corsHeaders();
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: hdrs });
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (!body || (typeof body !== 'object')) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...hdrs, 'Content-Type': 'application/json' },
        });
      }
      await persist(body);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...hdrs, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), {
        status: 500,
        headers: { ...hdrs, 'Content-Type': 'application/json' },
      });
    }
  }

  if (req.method === 'GET') {
    const data = await retrieve();
    if (!data) {
      return new Response(JSON.stringify({ error: 'No data yet' }), {
        status: 404,
        headers: { ...hdrs, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...hdrs, 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method Not Allowed', { status: 405, headers: hdrs });
}
