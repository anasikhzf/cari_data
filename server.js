/**
 * Standalone Node.js Express Server Proxy for Server-Side Security & Title Extraction.
 * Hides raw Google Sheet URLs behind server-side proxy route /api/proxy
 */

const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, './')));

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

  let sheetId = null;
  let serverFetchUrl = targetUrl.trim();

  if (serverFetchUrl.includes('docs.google.com/spreadsheets')) {
    const sheetIdMatch = serverFetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = serverFetchUrl.match(/[?&]gid=([0-9]+)/) || serverFetchUrl.match(/#gid=([0-9]+)/);
    if (sheetIdMatch && sheetIdMatch[1]) {
      sheetId = sheetIdMatch[1];
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      serverFetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
    }
  }

  // Server-Side Title Extraction
  let extractedTitle = '';
  if (sheetId) {
    try {
      const htmlUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
      const htmlRes = await fetch(htmlUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (htmlRes.ok) {
        const htmlText = await htmlRes.text();
        const match = htmlText.match(/<title>(.*?)<\/title>/i);
        if (match && match[1]) {
          let clean = match[1].replace(/- Google (Sheets|Drive|Dokumen)/gi, '').trim();
          if (clean && !clean.toLowerCase().includes('google sheets') && clean.length > 1) {
            extractedTitle = clean;
          }
        }
      }
    } catch (e) {}
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
    res.setHeader('Access-Control-Expose-Headers', 'X-Sheet-Title');
    if (extractedTitle) {
      res.setHeader('X-Sheet-Title', encodeURIComponent(extractedTitle));
    }
    res.send(data);
  } catch (err) {
    res.status(500).json({ error: 'Server proxy error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server-Side Security Proxy running on http://localhost:${PORT}`);
});
