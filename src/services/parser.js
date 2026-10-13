import { db } from './db';

export class DocumentParser {
  static obfuscateUrl(urlStr) {
    try {
      return btoa(urlStr.trim());
    } catch {
      return encodeURIComponent(urlStr.trim());
    }
  }

  static normalizeUrl(urlStr) {
    let cleanUrl = urlStr.trim();
    if (cleanUrl.includes('docs.google.com/spreadsheets')) {
      const sheetIdMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = cleanUrl.match(/[?&]gid=([0-9]+)/) || cleanUrl.match(/#gid=([0-9]+)/);

      if (sheetIdMatch && sheetIdMatch[1]) {
        const sheetId = sheetIdMatch[1];
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
        return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}&_t=${Date.now()}`;
      }
    }
    return cleanUrl;
  }

  static async fetchGoogleSheetTitle(sheetId) {
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/htmlview`;
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const data = await res.json();
        const html = data.contents || '';
        const match = html.match(/<title>(.*?)<\/title>/i) || html.match(/meta property="og:title" content="(.*?)"/i);
        if (match && match[1]) {
          const cleanTitle = match[1].replace(/- Google (Sheets|Drive|Dokumen)/gi, '').trim();
          if (cleanTitle && !cleanTitle.toLowerCase().includes('google sheets') && !/^doc[_-]/i.test(cleanTitle) && cleanTitle.length > 1) {
            return cleanTitle;
          }
        }
      }
    } catch {}

    try {
      const res = await fetch(targetUrl, { mode: 'cors' });
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/<title>(.*?)<\/title>/i);
        if (match && match[1]) {
          const cleanTitle = match[1].replace(/- Google (Sheets|Drive|Dokumen)/gi, '').trim();
          if (cleanTitle && !/^doc[_-]/i.test(cleanTitle) && cleanTitle.length > 1) {
            return cleanTitle;
          }
        }
      }
    } catch {}

    return null;
  }

  static async parseFromUrl(rawUrl, customTitle = '', existingId = null) {
    let title = customTitle ? customTitle.trim() : '';
    if (title && /^doc[_-]/i.test(title)) {
      title = '';
    }

    const b64Url = this.obfuscateUrl(rawUrl);
    const proxyEndpoint = `/api/proxy?b64=${encodeURIComponent(b64Url)}&_t=${Date.now()}`;
    let fetchedText = null;

    // 1. Server-side proxy
    try {
      const response = await fetch(proxyEndpoint, { cache: 'no-store' });
      if (response.ok) {
        const serverTitleHeader = response.headers.get('X-Sheet-Title');
        if (serverTitleHeader && !title) {
          try {
            const decoded = decodeURIComponent(serverTitleHeader);
            if (!/^doc[_-]/i.test(decoded)) title = decoded;
          } catch {
            if (!/^doc[_-]/i.test(serverTitleHeader)) title = serverTitleHeader;
          }
        }

        const text = await response.text();
        if (text && !text.trim().toLowerCase().startsWith('<!doctype html') && !text.trim().toLowerCase().startsWith('<html')) {
          fetchedText = text;
        }
      }
    } catch (err) {
      console.warn('Proxy fetch failed or not available:', err);
    }

    // 2. Direct fetch fallback
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
      } catch {
        try {
          const publicProxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          const response = await fetch(publicProxy);
          if (response.ok) {
            const text = await response.text();
            if (text && !text.trim().toLowerCase().startsWith('<!doctype html') && !text.trim().toLowerCase().startsWith('<html')) {
              fetchedText = text;
            }
          }
        } catch {}
      }
    }

    if (!fetchedText || fetchedText.trim().toLowerCase().startsWith('<!doctype html') || fetchedText.trim().toLowerCase().startsWith('<html')) {
      throw new Error('Gagal membaca data spreadsheet. Pastikan akses Google Sheet diset "Siapa saja yang memiliki link dapat melihat".');
    }

    if (!title || title.startsWith('Spreadsheet ') || title === 'Dokumen Spreadsheet' || /^doc[_-]/i.test(title)) {
      if (rawUrl.includes('docs.google.com/spreadsheets')) {
        const sheetIdMatch = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetIdMatch && sheetIdMatch[1]) {
          const fetchedTitle = await this.fetchGoogleSheetTitle(sheetIdMatch[1]);
          if (fetchedTitle && !/^doc[_-]/i.test(fetchedTitle)) {
            title = fetchedTitle;
          }
        }
      }
    }

    if (!title || /^doc[_-]/i.test(title)) {
      title = this.extractTitleFromUrl(rawUrl);
    }

    return this.parseText(fetchedText, title, rawUrl, existingId);
  }

  static async parseMasterIndexSheet(masterUrl) {
    const indexDoc = await this.parseFromUrl(masterUrl, 'Master Database');
    const documents = [];

    const headers = indexDoc.headers.map(h => h.toLowerCase());
    const idColIdx = headers.findIndex(h => h.includes('id'));
    const nameColIdx = headers.findIndex(h => h.includes('nama') || h.includes('title') || h.includes('dokumen'));
    const urlColIdx = headers.findIndex(h => h.includes('link') || h.includes('url') || h.includes('spreadsheet') || h.includes('csv'));
    const colorColIdx = headers.findIndex(h => h.includes('warna') || h.includes('color') || h.includes('badge'));
    const folderColIdx = headers.findIndex(h => h.includes('folder') || h.includes('kategori') || h.includes('kelompok'));
    const pinColIdx = headers.findIndex(h => h.includes('pin') || h.includes('kunci') || h.includes('password'));
    const timeColIdx = headers.findIndex(h => h.includes('waktu') || h.includes('tanggal') || h.includes('upload') || h.includes('time'));

    for (let i = 0; i < indexDoc.rows.length; i++) {
      const row = indexDoc.rows[i];
      const url = urlColIdx >= 0 ? row[urlColIdx] : row.find(c => c && c.includes('http'));
      const rawId = idColIdx >= 0 ? row[idColIdx] : '';
      const rawName = nameColIdx >= 0 ? row[nameColIdx] : '';
      const rawFolder = folderColIdx >= 0 ? row[folderColIdx] : '';
      const rawPin = pinColIdx >= 0 ? row[pinColIdx] : '';
      const rawTime = timeColIdx >= 0 ? row[timeColIdx] : '';

      const baseId = rawId && rawId.trim() ? rawId.trim() : `DOC-${i + 1}-${Math.floor(Math.random() * 8999 + 1000)}`;
      const cleanId = `${baseId}_idx${i}`;
      const cleanName = rawName ? rawName.trim() : '';
      const cleanFolder = rawFolder ? rawFolder.trim() : '';
      const cleanPin = rawPin ? rawPin.trim() : null;

      if (url && url.startsWith('http')) {
        try {
          const doc = await this.parseFromUrl(url, cleanName, cleanId);
          doc.id = cleanId;

          if (colorColIdx >= 0 && row[colorColIdx] && row[colorColIdx].trim()) {
            doc.badgeColor = row[colorColIdx].trim();
          }

          if (cleanFolder) {
            const folderId = await db.getOrCreateFolderByName(cleanFolder);
            doc.folderId = folderId;
          }

          if (cleanPin) {
            doc.pinHash = cleanPin;
          }

          if (rawTime && rawTime.trim()) {
            doc.updatedAt = rawTime.trim();
          }

          documents.push(doc);
        } catch (e) {
          console.warn('Failed to parse sub-document:', url, e);
        }
      } else if (cleanFolder || cleanName) {
        const folderNameToCreate = cleanFolder || cleanName;
        if (folderNameToCreate.toLowerCase() !== 'nama folder' && folderNameToCreate.toLowerCase() !== 'folder') {
          await db.getOrCreateFolderByName(folderNameToCreate, cleanPin);
        }
      }
    }

    return documents;
  }

  static extractTitleFromUrl(url) {
    try {
      const parsed = new URL(url);
      const filename = parsed.pathname.split('/').pop();
      if (filename && filename.length > 2 && !filename.includes('gviz') && !filename.includes('edit')) {
        return decodeURIComponent(filename).replace(/(\.csv|\.tsv|\.txt)$/i, '');
      }
      return 'Dokumen Spreadsheet';
    } catch {
      return 'Dokumen Spreadsheet';
    }
  }

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
    const validRows = rows.filter(r => r.length > 0 && !r.some(c => c && (c.includes('<!DOCTYPE') || c.includes('<html'))));

    if (validRows.length === 0) {
      throw new Error('Data spreadsheet tidak ditemukan atau file kosong.');
    }

    const rawHeaders = validRows[0];
    const headers = rawHeaders.map((h, idx) => (h && h.trim()) ? h.trim() : `Kolom ${idx + 1}`);
    const dataRows = validRows.slice(1).filter(r => r.some(cell => cell && cell.trim() !== ''));

    const cleanTitle = (title && !/^doc[_-]/i.test(title.trim())) ? title.trim() : 'Dokumen Spreadsheet';
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
    const badgeColor = colors[Math.abs(this.hashCode(cleanTitle)) % colors.length];

    return {
      id: existingId || ('doc_' + Math.abs(this.hashCode(cleanTitle + sourceUrl))),
      name: cleanTitle,
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
