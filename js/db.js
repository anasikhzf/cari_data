/**
 * Database module using IndexedDB for high-capacity, ultra-fast client-side storage
 * with Folder support, PIN Security Locking, and 30-Day Auto Inactivity Cleanup.
 */
class DocumentDB {
  constructor() {
    this.dbName = 'CariDataDB';
    this.version = 2;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('documents')) {
          const docStore = db.createObjectStore('documents', { keyPath: 'id' });
          docStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          docStore.createIndex('folderId', 'folderId', { unique: false });
        } else {
          const docStore = event.target.transaction.objectStore('documents');
          if (!docStore.indexNames.contains('folderId')) {
            docStore.createIndex('folderId', 'folderId', { unique: false });
          }
        }

        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async ensureInitialized() {
    if (!this.db) {
      await this.init();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Document CRUD & Access Updates                                             */
  /* -------------------------------------------------------------------------- */
  async getAllDocuments(folderId = null) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();

      request.onsuccess = () => {
        let docs = request.result.map(doc => ({
          id: doc.id,
          name: doc.name,
          sourceUrl: doc.sourceUrl,
          rowCount: doc.rowCount,
          colCount: doc.colCount,
          headers: doc.headers,
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
        resolve(docs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDocumentById(id) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.get(id);

      request.onsuccess = () => {
        const doc = request.result;
        if (doc) {
          this.touchDocumentAccess(doc);
        }
        resolve(doc);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async touchDocumentAccess(doc) {
    try {
      doc.lastAccessedAt = new Date().toISOString();
      const transaction = this.db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      store.put(doc);
    } catch {}
  }

  async saveDocument(doc) {
    await this.ensureInitialized();
    if (!doc.lastAccessedAt) {
      doc.lastAccessedAt = new Date().toISOString();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.put(doc);

      request.onsuccess = () => resolve(doc.id);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(id) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Folder CRUD Operations                                                     */
  /* -------------------------------------------------------------------------- */
  async getAllFolders() {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readonly');
      const store = transaction.objectStore('folders');
      const request = store.getAll();

      request.onsuccess = () => {
        const folders = request.result;
        folders.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        resolve(folders);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getFolderById(id) {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readonly');
      const store = transaction.objectStore('folders');
      const request = store.get(id);

      request.onsuccess = () => {
        const folder = request.result;
        if (folder) {
          this.touchFolderAccess(folder);
        }
        resolve(folder);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async touchFolderAccess(folder) {
    try {
      folder.lastAccessedAt = new Date().toISOString();
      const transaction = this.db.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      store.put(folder);
    } catch {}
  }

  async saveFolder(folder) {
    await this.ensureInitialized();
    if (!folder.lastAccessedAt) {
      folder.lastAccessedAt = new Date().toISOString();
    }
    if (!folder.updatedAt) {
      folder.updatedAt = new Date().toISOString();
    }
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.put(folder);

      request.onsuccess = () => resolve(folder.id);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFolder(id) {
    await this.ensureInitialized();
    // Move contained documents back to ROOT
    const allDocs = await this.getAllDocuments(id);
    for (const d of allDocs) {
      const fullDoc = await this.getDocumentById(d.id);
      if (fullDoc) {
        fullDoc.folderId = null;
        await this.saveDocument(fullDoc);
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Auto Cleanup Inactive Items (> 30 Days / 1 Month)                         */
  /* -------------------------------------------------------------------------- */
  async performAutoCleanup(maxInactiveDays = 30) {
    await this.ensureInitialized();
    const thresholdMs = maxInactiveDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    let deletedDocsCount = 0;
    let deletedFoldersCount = 0;

    // 1. Clean inactive documents
    const allDocs = await new Promise((resolve) => {
      const tx = this.db.transaction(['documents'], 'readonly');
      const req = tx.objectStore('documents').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const doc of allDocs) {
      const lastAccess = new Date(doc.lastAccessedAt || doc.updatedAt).getTime();
      if (now - lastAccess > thresholdMs) {
        await this.deleteDocument(doc.id);
        deletedDocsCount++;
      }
    }

    // 2. Clean inactive folders
    const allFolders = await this.getAllFolders();
    for (const folder of allFolders) {
      const lastAccess = new Date(folder.lastAccessedAt || folder.updatedAt).getTime();
      if (now - lastAccess > thresholdMs) {
        await this.deleteFolder(folder.id);
        deletedFoldersCount++;
      }
    }

    return { deletedDocsCount, deletedFoldersCount };
  }
}

export const db = new DocumentDB();
