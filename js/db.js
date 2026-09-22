/**
 * In-Memory Database module replacing browser storage (IndexedDB).
 * Uses Google Spreadsheet as the primary source of truth (DB utama).
 */
class DocumentDB {
  constructor() {
    this.documents = new Map();
    this.folders = new Map();
  }

  async init() {
    // In-memory initialization ready instantly
    return true;
  }

  async ensureInitialized() {
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /* Document CRUD & Access Updates                                             */
  /* -------------------------------------------------------------------------- */
  async getAllDocuments(folderId = null) {
    let docs = Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      name: doc.name,
      sourceUrl: doc.sourceUrl,
      rowCount: doc.rowCount,
      colCount: doc.colCount,
      headers: doc.headers,
      rows: doc.rows,
      updatedAt: doc.updatedAt,
      lastAccessedAt: doc.lastAccessedAt || doc.updatedAt,
      badgeColor: doc.badgeColor,
      folderId: doc.folderId || null,
      pinHash: doc.pinHash || null
    }));

    if (folderId === 'ROOT' || folderId === null) {
      docs = docs.filter(d => !d.folderId || d.folderId === 'ROOT');
    } else if (folderId) {
      docs = docs.filter(d => d.folderId === folderId);
    }

    docs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return docs;
  }

  async getDocumentById(id) {
    const doc = this.documents.get(id);
    if (doc) {
      doc.lastAccessedAt = new Date().toISOString();
    }
    return doc || null;
  }

  async saveDocument(doc) {
    if (doc.sourceUrl) {
      const sheetIdMatch = doc.sourceUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const docSheetId = sheetIdMatch && sheetIdMatch[1] ? sheetIdMatch[1] : null;

      // Find if document already exists by sourceUrl or sheetId
      for (const [existingId, existingDoc] of this.documents.entries()) {
        const existingMatch = existingDoc.sourceUrl ? existingDoc.sourceUrl.match(/\/d\/([a-zA-Z0-9-_]+)/) : null;
        const existingSheetId = existingMatch && existingMatch[1] ? existingMatch[1] : null;

        if (
          (docSheetId && existingSheetId && docSheetId === existingSheetId) ||
          (existingDoc.sourceUrl && existingDoc.sourceUrl === doc.sourceUrl)
        ) {
          doc.id = existingId;
          break;
        }
      }
    }

    if (!doc.id) {
      doc.id = 'doc_' + Date.now();
    }
    if (!doc.lastAccessedAt) {
      doc.lastAccessedAt = new Date().toISOString();
    }
    if (!doc.updatedAt) {
      doc.updatedAt = new Date().toISOString();
    }
    this.documents.set(doc.id, doc);
    return doc.id;
  }

  async deleteDocument(id) {
    return this.documents.delete(id);
  }

  async clearAllDocuments() {
    this.documents.clear();
  }

  /* -------------------------------------------------------------------------- */
  /* Folder Operations                                                          */
  /* -------------------------------------------------------------------------- */
  async getAllFolders() {
    const folders = Array.from(this.folders.values());
    folders.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return folders;
  }

  async getFolderById(id) {
    const folder = this.folders.get(id);
    if (folder) {
      folder.lastAccessedAt = new Date().toISOString();
    }
    return folder || null;
  }

  async saveFolder(folder) {
    if (!folder.id) {
      folder.id = 'folder_' + Date.now();
    }
    if (!folder.lastAccessedAt) {
      folder.lastAccessedAt = new Date().toISOString();
    }
    if (!folder.updatedAt) {
      folder.updatedAt = new Date().toISOString();
    }
    this.folders.set(folder.id, folder);
    return folder.id;
  }

  async deleteFolder(id) {
    // Move contained documents back to ROOT
    for (const [docId, doc] of this.documents.entries()) {
      if (doc.folderId === id) {
        doc.folderId = null;
      }
    }
    return this.folders.delete(id);
  }

  async performAutoCleanup(maxInactiveDays = 30) {
    return { deletedDocsCount: 0, deletedFoldersCount: 0 };
  }
}

export const db = new DocumentDB();

