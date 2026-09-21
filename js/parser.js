/**
 * Parser utility with Server-Side Proxy & Title Auto-Discovery Integration.
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
   * Fetch exact Google Sheet title via CORS proxy fallback
   */
  static async fetchGoogleSheetTitle(sheetId) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/<title>(.*?)<\/title>/i);
        if (match && match[1]) {
          const cleanTitle = match[1].replace(/- Google (Sheets|Drive|Dokumen)/gi, '').trim();
          if (cleanTitle && !cleanTitle.toLowerCase().includes('google sheets') && cleanTitle.length > 1) {
            return cleanTitle;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Fetch and parse document data via Server-Side Proxy (/api/proxy) or Direct Fetch
   */
  static async parseFromUrl(rawUrl, customTitle = '', existingId = null) {
    let title = customTitle;
    let b64Url = this.obfuscateUrl(rawUrl);
    let proxyEndpoint = `/api/proxy?b64=${encodeURIComponent(b64Url)}`;
    let fetchedText = null;

    // 1. Attempt Server-Side Proxy Fetch
    try {
      const response = await fetch(proxyEndpoint);
      if (response.ok) {
        // Read X-Sheet-Title header from Server Proxy
        const serverTitleHeader = response.headers.get('X-Sheet-Title');
        if (serverTitleHeader && !title) {
          try {
            title = decodeURIComponent(serverTitleHeader);
          } catch {
            title = serverTitleHeader;
          }
        }

        const text = await response.text();
        if (text && !text.trim().toLowerCase().startsWith('<!doctype html') && !text.trim().toLowerCase().startsWith('<html')) {
          fetchedText = text;
        }
      }
    } catch (err) {
      console.warn('Server-Side Proxy unavailable, trying direct fetch:', err);
    }

    // 2. Direct fetch fallback if proxy unavailable
    if (!fetchedText) {
      const targetUrl = this.normalizeUrl(rawUrl);
      try {
        const response = await fetch(targetUrl, { mode: 'cors' });
        if (response.ok) {
          const text = await response.text();
          if (text && !text.trim().toLowerCase().startsWith('<!doctype html') && !text.trim().toLowerCase().startsWith('<html')) {
            fetchedText = text;
          }
        }
      } catch (err) {
        try {
          const publicProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          const response = await fetch(publicProxy);
          if (response.ok) {
            const text = await response.text();
            if (text && !text.trim().toLowerCase().startsWith('<!doctype html') && !text.trim().toLowerCase().startsWith('<html')) {
              fetchedText = text;
            }
          }
        } catch (e) {}
      }
    }

    if (!fetchedText || fetchedText.trim().toLowerCase().startsWith('<!doctype html') || fetchedText.trim().toLowerCase().startsWith('<html')) {
      throw new Error('Gagal membaca data spreadsheet. Pastikan akses Google Sheet sudah diset "Siapa saja yang memiliki link dapat melihat".');
    }

    // Try fetching title via CORS proxy if title still blank or default
    if (!title || title.startsWith('Spreadsheet ')) {
      if (rawUrl.includes('docs.google.com/spreadsheets')) {
        const sheetIdMatch = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetIdMatch && sheetIdMatch[1]) {
          const fetchedTitle = await this.fetchGoogleSheetTitle(sheetIdMatch[1]);
          if (fetchedTitle) title = fetchedTitle;
        }
      }
    }

    if (!title) {
      title = this.extractTitleFromUrl(rawUrl);
    }

    return this.parseText(fetchedText, title, rawUrl, existingId);
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
      const name = nameColIdx >= 0 ? row[nameColIdx] : '';

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
    if (!text || !text.trim() || text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
      throw new Error('Dokumen kosong atau format tidak sesuai (bukan CSV/Spreadsheet).');
    }

    const firstLine = text.split('\n')[0] || '';
    let delimiter = ',';
    if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) {
      delimiter = '\t';
    } else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
      delimiter = ';';
    }

    const rows = this.parseCSV(text, delimiter);

    // Filter out any HTML lines or empty rows
    const validRows = rows.filter(r => r.length > 0 && !r.some(c => c && (c.includes('<!DOCTYPE') || c.includes('<html'))));

    if (validRows.length === 0) {
      throw new Error('Data spreadsheet tidak ditemukan atau file kosong.');
    }

    const rawHeaders = validRows[0];
    const headers = rawHeaders.map((h, idx) => (h && h.trim()) ? h.trim() : `Kolom ${idx + 1}`);
    const dataRows = validRows.slice(1).filter(r => r.some(cell => cell && cell.trim() !== ''));

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
