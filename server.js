/**
 * Standalone Node.js Express Server Proxy for Server-Side Security.
 * Hides raw Google Sheet URLs behind server-side proxy route /api/proxy
 * 
 * Usage: node server.js
 */

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static web app assets
app.use(express.static(path.join(__dirname, './')));

// Server-Side Proxy Endpoint
app.get('/api/proxy', async (req, res) => {
  let targetUrl = req.query.url || req.query.target || '';

  if (req.query.b64) {
    try {
      targetUrl = Buffer.from(req.query.b64, 'base64').toString('utf-8');
    } catch {}
  }

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target URL parameter' });
  }

  // Normalize Google Sheet URL on server side
  let serverFetchUrl = targetUrl.trim();
  if (serverFetchUrl.includes('docs.google.com/spreadsheets')) {
    const sheetIdMatch = serverFetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = serverFetchUrl.match(/[?&]gid=([0-9]+)/) || serverFetchUrl.match(/#gid=([0-9]+)/);
    if (sheetIdMatch && sheetIdMatch[1]) {
      const sheetId = sheetIdMatch[1];
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      serverFetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
    }
  }

  try {
    const response = await fetch(serverFetchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Server-Proxy' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Server fetch error: ${response.status}` });
    }

    const data = await response.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: 'Server proxy error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server-Side Security Proxy running on http://localhost:${PORT}`);
});
