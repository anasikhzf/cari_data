/**
 * Cloudflare Pages Function (Server-Side Proxy Endpoint)
 * Runs 100% Server-Side on Cloudflare Workers Edge.
 * Hides raw Google Sheet URLs and extracts real Sheet Titles server-side without CORS limits.
 */

export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers': 'X-Sheet-Title',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let targetUrl = reqUrl.searchParams.get('url') || reqUrl.searchParams.get('target') || '';

  if (reqUrl.searchParams.get('b64')) {
    try {
      targetUrl = atob(reqUrl.searchParams.get('b64'));
    } catch {}
  }

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing target spreadsheet URL' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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

  // 1. Server-Side Title Extraction
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
    } catch (e) {
      console.warn('Server title fetch error:', e);
    }
  }

  // 2. Fetch CSV Data Server-Side
  try {
    const response = await fetch(serverFetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Server-Proxy'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Server-Side fetch failed: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const csvData = await response.text();

    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'text/plain; charset=utf-8'
    };

    if (extractedTitle) {
      responseHeaders['X-Sheet-Title'] = encodeURIComponent(extractedTitle);
    }

    return new Response(csvData, {
      status: 200,
      headers: responseHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server-Side proxy error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
