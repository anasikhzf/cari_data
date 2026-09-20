/**
 * Database module using IndexedDB for high-capacity, ultra-fast client-side storage.
 */
class DocumentDB {
  constructor() {
    this.dbName = 'CariDataDB';
    this.version = 1;
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

  async getAllDocuments() {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['documents'], 'readonly');
      const store = transaction.objectStore('documents');
      const request = store.getAll();

      request.onsuccess = () => {
        // Return without full rows array for fast dashboard listing
        const docs = request.result.map(doc => ({
          id: doc.id,
          name: doc.name,
          sourceUrl: doc.sourceUrl,
          rowCount: doc.rowCount,
          colCount: doc.colCount,
          headers: doc.headers,
          updatedAt: doc.updatedAt,
          badgeColor: doc.badgeColor
        }));
        // Sort by updatedAt descending
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

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDocument(doc) {
    await this.ensureInitialized();
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

  async clearAll() {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['documents'], 'readwrite');
      const store = transaction.objectStore('documents');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async ensureInitialized() {
    if (!this.db) {
      await this.init();
    }
  }
}

export const db = new DocumentDB();
