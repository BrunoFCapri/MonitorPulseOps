import http from 'http';
import { parse as parseUrl } from 'url';
import handler from './api/metrics.js';

function wrapReq(req, body, query) {
  req.query = query;
  req.body = body;
  return req;
}

function wrapRes(res) {
  res.status = code => ({
    json(obj) {
      try {
        res.statusCode = code;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(obj));
      } catch (e) {
        try { res.end(); } catch(_) {}
      }
    }
  });
  res.json = obj => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  const { pathname, query } = parseUrl(req.url, true);
  if (pathname === '/api/metrics') {
    // accumulate body
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', async () => {
      let body = undefined;
      if (raw) {
        try { body = JSON.parse(raw); } catch { body = raw; }
      }
      try {
        await handler(wrapReq(req, body, query), wrapRes(res));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'handler error', message: String(e) }));
      }
    });
    return;
  }

  // static files quick serve for index.html etc.
  if (pathname === '/' || pathname.endsWith('.html') || pathname.endsWith('.js') || pathname.endsWith('.css')) {
    // naive static loader
    const fsPath = new URL('.' + (pathname === '/' ? '/index.html' : pathname), import.meta.url);
    try {
      const data = await import('node:fs/promises').then(fs => fs.readFile(fsPath));
      const ext = pathname.split('.').pop();
      const mime = ext === 'html' ? 'text/html' : ext === 'js' ? 'application/javascript' : ext === 'css' ? 'text/css' : 'application/octet-stream';
      res.statusCode = 200;
      res.setHeader('Content-Type', mime);
      res.end(data);
    } catch (e) {
      res.statusCode = 404;
      res.end('Not found');
    }
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Local server listening on http://localhost:${PORT}`);
});
