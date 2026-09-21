/**
 * Parser utility with Server-Side Proxy integration.
 * Obfuscates and routes raw Google Sheet URLs through backend endpoint (/api/proxy)
 * so sheet links cannot be inspected or snooped in client browser DevTools / Network tab.
 */

export class DocumentParser {
  /**
   * Base64 encode URL for obfuscating client network requests
   */
  static obfuscateUrl(urlStr) {
    try {
      return btoa(urlStr.trim());
    } catch {
      return encodeURIComponent(urlStr.trim());
    }
  }

  /**
   * Convert any Google Sheet URL to a direct CSV export URL if possible
   */
  static normalizeUrl(urlStr) {
    let cleanUrl = urlStr.trim();

    if (cleanUrl.includes('docs.google.com/spreadsheets')) {
      const sheetIdMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = cleanUrl.match(/[?&]gid=([0-9]+)/) || cleanUrl.match(/#gid=([0-9]+)/);

      if (sheetIdMatch && sheetIdMatch[1]) {
        const sheetId = sheetIdMatch[1];
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
        return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
      }
    }

    return cleanUrl;
  }

  /**
   * Fetch and parse document data via Server-Side Proxy (/api/proxy)
   */
  static async parseFromUrl(rawUrl, customTitle = '', existingId = null) {
    let title = customTitle;
    const b64Url = this.obfuscateUrl(rawUrl);

    // Primary Server-Side Security Proxy URL
    const proxyEndpoint = `/api/proxy?b64=${encodeURIComponent(b64Url)}`;

    try {
      // 1. Attempt Server-Side Proxy Fetch (Keeps Google Sheet link hidden from Network Inspector)
      const response = await fetch(proxyEndpoint);
      if (response.ok) {
        const text = await response.text();
        if (!title) title = this.extractTitleFromUrl(rawUrl);
        return this.parseText(text, title, rawUrl, existingId);
      }
      throw new Error(`Server Proxy returned HTTP ${response.status}`);
    } catch (serverProxyErr) {
      console.warn('Server-Side Proxy unavailable, trying direct server fetch:', serverProxyErr);

      // 2. Direct fetch fallback for local preview / standalone mode
      const targetUrl = this.normalizeUrl(rawUrl);
      try {
        const response = await fetch(targetUrl, { mode: 'cors' });
        if (!response.ok) throw new Error(`Fetch status: ${response.status}`);
        const text = await response.text();
        if (!title) title = this.extractTitleFromUrl(rawUrl);
        return this.parseText(text, title, rawUrl, existingId);
      } catch (err) {
        try {
          const publicProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          const response = await fetch(publicProxy);
          if (!response.ok) throw new Error('Public proxy failed');
          const text = await response.text();
          if (!title) title = this.extractTitleFromUrl(rawUrl);
          return this.parseText(text, title, rawUrl, existingId);
        } catch (e) {
          throw new Error(`Gagal mengunduh spreadsheet. Pastikan akses diset "Siapa saja yang memiliki link dapat melihat". (${e.message})`);
        }
      }
    }
  }

  /**
   * Parse a Master Index Google Sheet via Server-Side Proxy
   */
  static async parseMasterIndexSheet(masterUrl) {
    const indexDoc = await this.parseFromUrl(masterUrl, 'Master Database');
    const documents = [];

    const headers = indexDoc.headers.map(h => h.toLowerCase());
    const nameColIdx = headers.findIndex(h => h.includes('nama') || h.includes('title') || h.includes('dokumen'));
    const urlColIdx = headers.findIndex(h => h.includes('link') || h.includes('url') || h.includes('spreadsheet') || h.includes('csv'));
    const colorColIdx = headers.findIndex(h => h.includes('warna') || h.includes('color') || h.includes('badge'));

    for (const row of indexDoc.rows) {
      const url = urlColIdx >= 0 ? row[urlColIdx] : row.find(c => c && c.includes('http'));
      const name = nameColIdx >= 0 ? row[nameColIdx] : 'Dokumen Cloud';

      if (url && url.startsWith('http')) {
        try {
          const doc = await this.parseFromUrl(url, name);
          if (colorColIdx >= 0 && row[colorColIdx]) {
            doc.badgeColor = row[colorColIdx];
          }
          documents.push(doc);
        } catch (e) {
          console.warn('Failed to parse sub-document from Master Index:', url, e);
        }
      }
    }

    return documents;
  }

  static extractTitleFromUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('google.com')) {
        const pathParts = parsed.pathname.split('/');
        const idPart = pathParts[3] || 'Dokumen';
        return 'Spreadsheet ' + idPart.substring(0, 10);
      }
      const filename = parsed.pathname.split('/').pop();
      if (filename && filename.length > 2) {
        return decodeURIComponent(filename).replace(/(\.csv|\.tsv|\.txt)$/i, '');
      }
      return 'Dokumen ' + new Date().toLocaleDateString('id-ID');
    } catch {
      return 'Dokumen Spreadsheet';
    }
  }

  /**
   * Parse raw CSV/TSV text string into headers & row arrays
   */
  static parseText(text, title = 'Dokumen CSV', sourceUrl = '', existingId = null) {
    if (!text || !text.trim()) {
      throw new Error('Dokumen kosong atau format tidak sesuai.');
    }

    const firstLine = text.split('\n')[0] || '';
    let delimiter = ',';
    if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
      delimiter = '\t';
    } else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
      delimiter = ';';
    }

    const rows = this.parseCSV(text, delimiter);

    if (rows.length === 0) {
      throw new Error('Data spreadsheet tidak ditemukan.');
    }

    const rawHeaders = rows[0];
    const headers = rawHeaders.map((h, idx) => (h && h.trim()) ? h.trim() : `Kolom ${idx + 1}`);
    const dataRows = rows.slice(1).filter(r => r.some(cell => cell && cell.trim() !== ''));

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
    const badgeColor = colors[Math.abs(this.hashCode(title)) % colors.length];

    return {
      id: existingId || ('doc_' + Math.abs(this.hashCode(title + sourceUrl))),
      name: title || 'Dokumen Spreadsheet',
      sourceUrl: sourceUrl,
      headers: headers,
      rows: dataRows,
      rowCount: dataRows.length,
      colCount: headers.length,
      updatedAt: new Date().toISOString(),
      badgeColor: badgeColor
    };
  }

  static hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  /**
   * Fast RFC 4180 compliant CSV parser
   */
  static parseCSV(text, delimiter = ',') {
    const lines = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        row.push(cell.trim());
        if (row.length > 0 && row.some(c => c !== '')) {
          lines.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }

    if (cell.length > 0 || row.length > 0) {
      row.push(cell.trim());
      if (row.some(c => c !== '')) {
        lines.push(row);
      }
    }

    return lines;
  }
}
