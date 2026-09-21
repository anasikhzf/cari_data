/**
 * Cloudflare Pages Function (Server-Side Proxy Endpoint)
 * Runs 100% Server-Side on Cloudflare Workers Edge.
 * Hides raw Google Sheet URLs from client browser DevTools and Network tab.
 */

export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);

  // Set CORS headers so PWA can consume data securely
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=60, s-maxage=300'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let targetUrl = reqUrl.searchParams.get('url') || reqUrl.searchParams.get('target') || '';

  // Decode base64 encoded URL if obfuscated by client
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

  // Normalize Google Sheet URL to direct CSV export endpoint on server
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
    // Perform secure Server-Side fetch to Google Servers
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

    // Return sanitized CSV payload directly without revealing Google Sheet headers or source URLs
    return new Response(csvData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server-Side proxy error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
