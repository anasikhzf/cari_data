/**
 * In-Memory Database store with optional caching and Master Google Sheets as Single Source of Truth
 */
class DocumentDB {
  constructor() {
    this.documents = new Map();
    this.folders = new Map();
  }

  async init() {
    return true;
  }

  async getAllDocuments(folderId = null) {
    let docs = Array.from(this.documents.values()).map(doc => ({ ...doc }));

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
    return doc ? { ...doc } : null;
  }

  async saveDocument(doc) {
    if (!doc.id) {
      doc.id = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }
    if (!doc.lastAccessedAt) {
      doc.lastAccessedAt = new Date().toISOString();
    }
    if (!doc.updatedAt) {
      doc.updatedAt = new Date().toISOString();
    }
    this.documents.set(doc.id, { ...doc });
    return doc.id;
  }

  async deleteDocument(id) {
    return this.documents.delete(id);
  }

  async clearAllDocuments() {
    this.documents.clear();
  }

  async getAllFolders() {
    const folders = Array.from(this.folders.values()).map(f => ({ ...f }));
    folders.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return folders;
  }

  async getFolderById(id) {
    const folder = this.folders.get(id);
    if (folder) {
      folder.lastAccessedAt = new Date().toISOString();
    }
    return folder ? { ...folder } : null;
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
    this.folders.set(folder.id, { ...folder });
    return folder.id;
  }

  async deleteFolder(id) {
    for (const [docId, doc] of this.documents.entries()) {
      if (doc.folderId === id) {
        doc.folderId = null;
      }
    }
    return this.folders.delete(id);
  }

  async clearAllFolders() {
    this.folders.clear();
  }

  async getOrCreateFolderByName(name, pinHash = null) {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim();

    for (const folder of this.folders.values()) {
      if (folder.name.toLowerCase() === cleanName.toLowerCase()) {
        if (pinHash && !folder.pinHash) {
          folder.pinHash = pinHash;
        }
        return folder.id;
      }
    }

    const folderId = 'folder_' + Math.abs(this.hashCode(cleanName));
    const folder = {
      id: folderId,
      name: cleanName,
      pinHash: pinHash || null,
      parentId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };
    await this.saveFolder(folder);
    return folderId;
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export const db = new DocumentDB();
