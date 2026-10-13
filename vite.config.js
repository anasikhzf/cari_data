import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Custom Vite middleware to handle /api/proxy directly during development
function devProxyPlugin() {
  return {
    name: 'dev-google-sheets-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/proxy')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost');
          let targetUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('target') || '';

          if (urlObj.searchParams.get('b64')) {
            try {
              targetUrl = Buffer.from(urlObj.searchParams.get('b64'), 'base64').toString('utf-8');
            } catch {}
          }

          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Missing target spreadsheet URL' }));
          }

          if (!targetUrl.includes('docs.google.com/spreadsheets/')) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Akses ditolak: Hanya URL Google Spreadsheet resmi yang diizinkan.' }));
          }

          let sheetId = null;
          let serverFetchUrl = targetUrl.trim();

          if (serverFetchUrl.includes('docs.google.com/spreadsheets')) {
            const sheetIdMatch = serverFetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
            const gidMatch = serverFetchUrl.match(/[?&]gid=([0-9]+)/) || serverFetchUrl.match(/#gid=([0-9]+)/);
            if (sheetIdMatch && sheetIdMatch[1]) {
              sheetId = sheetIdMatch[1];
              const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
              serverFetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}&_t=${Date.now()}`;
            }
          }

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
            } catch {}
          }

          const response = await fetch(serverFetchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Server-Proxy' }
          });

          if (!response.ok) {
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: `Fetch failed: ${response.status}` }));
          }

          const csvData = await response.text();
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Access-Control-Expose-Headers', 'X-Sheet-Title');
          if (extractedTitle) {
            res.setHeader('X-Sheet-Title', encodeURIComponent(extractedTitle));
          }
          res.end(csvData);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    devProxyPlugin()
  ],
  server: {
    port: 5173
  }
})
