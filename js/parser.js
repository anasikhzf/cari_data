/**
 * Parser utility for Google Sheets, CSV, and TSV document sources.
 */

export class DocumentParser {
  /**
   * Convert any Google Sheet URL to a direct CSV export URL if possible
   */
  static normalizeUrl(urlStr) {
    let cleanUrl = urlStr.trim();

    // Check for Google Sheets URL patterns
    if (cleanUrl.includes('docs.google.com/spreadsheets')) {
      // Extract Google Sheet ID if pattern matches /d/{SHEET_ID}/
      const sheetIdMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = cleanUrl.match(/[?&]gid=([0-9]+)/) || cleanUrl.match(/#gid=([0-9]+)/);

      if (sheetIdMatch && sheetIdMatch[1]) {
        const sheetId = sheetIdMatch[1];
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
        // Return CSV export URL via Google Viz API which works seamlessly for public sheets
        return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
      }
    }

    return cleanUrl;
  }

  /**
   * Fetch exact Google Sheet title from HTML page meta title
   */
  static async fetchGoogleSheetTitle(sheetId) {
    try {
      const pageUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
      const res = await fetch(pageUrl);
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/<title>(.*?)<\/title>/i);
        if (match && match[1]) {
          const cleanTitle = match[1].replace(/- Google (Sheets|Drive|Dokumen)/gi, '').trim();
          if (cleanTitle && !cleanTitle.includes('Google Sheets')) return cleanTitle;
        }
      }
    } catch (e) {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const html = await res.text();
          const match = html.match(/<title>(.*?)<\/title>/i);
          if (match && match[1]) {
            const cleanTitle = match[1].replace(/- Google (Sheets|Drive|Dokumen)/gi, '').trim();
            if (cleanTitle && !cleanTitle.includes('Google Sheets')) return cleanTitle;
          }
        }
      } catch {}
    }
    return null;
  }

  /**
   * Fetch and parse document data from a URL or raw text
   */
  static async parseFromUrl(rawUrl, customTitle = '', existingId = null) {
    const targetUrl = this.normalizeUrl(rawUrl);
    let title = customTitle;

    // Try fetching exact Google Sheet name if not provided
    if (!title && rawUrl.includes('docs.google.com/spreadsheets')) {
      const sheetIdMatch = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetIdMatch && sheetIdMatch[1]) {
        const fetchedTitle = await this.fetchGoogleSheetTitle(sheetIdMatch[1]);
        if (fetchedTitle) title = fetchedTitle;
      }
    }

    try {
      const response = await fetch(targetUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Gagal mengunduh file: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();

      if (!title) {
        title = this.extractTitleFromUrl(rawUrl, response);
      }

      return this.parseText(text, title, rawUrl, existingId);
    } catch (err) {
      console.warn('Direct fetch failed, trying CORS proxy:', err);
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Proxy fetch failed');
        const text = await response.text();
        if (!title) title = this.extractTitleFromUrl(rawUrl);
        return this.parseText(text, title, rawUrl, existingId);
      } catch (proxyErr) {
        throw new Error(`Tidak dapat mengakses link dokumen. Pastikan akses spreadsheet sudah diset "Siapa saja yang memiliki link dapat melihat". (${err.message})`);
      }
    }
  }

  static extractTitleFromUrl(url, response = null) {
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

    // Determine delimiter (comma, tab, or semicolon)
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

    // Header extraction
    const rawHeaders = rows[0];
    const headers = rawHeaders.map((h, idx) => (h && h.trim()) ? h.trim() : `Kolom ${idx + 1}`);
    const dataRows = rows.slice(1).filter(r => r.some(cell => cell && cell.trim() !== ''));

    // Random vibrant accent color badge for document card
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
    const badgeColor = colors[Math.floor(Math.random() * colors.length)];

    return {
      id: existingId || ('doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
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
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++; // Skip \n after \r
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
