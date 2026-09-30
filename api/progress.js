// Cross-device progress sync. Progress is stored in a PRIVATE Vercel Blob,
// keyed by a SHA-256 hash of the user's sync code (the code itself is never stored).
const { put, get } = require('@vercel/blob');
const crypto = require('crypto');

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = []; for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return res.status(503).json({ error: 'Sync storage is not connected yet' });
  const key = String(req.headers['x-sync-key'] || '');
  if (key.length < 8 || key.length > 200) return res.status(400).json({ error: 'Sync code must be at least 8 characters' });
  const hash = crypto.createHash('sha256').update('series65-study:v1:' + key).digest('hex');
  const pathname = `progress/${hash}.json`;
  try {
    if (req.method === 'GET') {
      let r = null;
      try { r = await get(pathname, { access: 'private', useCache: false }); }
      catch (e) { if (e && e.name === 'BlobNotFoundError') r = null; else throw e; }
      if (!r || r.statusCode !== 200) return res.status(200).json({ data: null });
      const text = await new Response(r.stream).text();
      return res.status(200).json({ data: JSON.parse(text) });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = await readBody(req);
      if (!body || typeof body.data !== 'object' || body.data === null) return res.status(400).json({ error: 'Missing data' });
      const json = JSON.stringify(body.data);
      if (json.length > 3000000) return res.status(413).json({ error: 'Progress too large' });
      await put(pathname, json, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
