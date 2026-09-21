import { db } from './db.js';
import { DocumentParser } from './parser.js';
import { searchEngine } from './searchEngine.js';
import { CONFIG } from '../data/config.js';
import { UIController } from './uiController.js';
import { ViewerController } from './viewerController.js';

class App {
  constructor() {
    this.currentTheme = localStorage.getItem('caridata_theme') || 'auto';
    this.deferredInstallPrompt = null;
    this.activeDocument = null;
    this.currentFolderId = null;
    this.currentFolder = null;
    this.masterSheetUrl = localStorage.getItem(CONFIG.STORAGE_KEY_MASTER_URL) || CONFIG.MASTER_SHEET_URL || '';

    this.pendingPinCallback = null;
    this.pendingPinTargetHash = null;

    this.ui = new UIController(this);
    this.viewer = new ViewerController(this);

    this.init();
  }

  async init() {
    this.setupTheme();
    this.setupPWA();
    this.initClock();
    this.bindEvents();
    await this.ui.checkNetworkStatus(true);

    try {
      await db.init();
      await this.runAutoCleanup();
      await this.handleUrlQueryImport();
      
      if (this.masterSheetUrl) {
        await this.syncFromMasterSheet(this.masterSheetUrl);
      } else {
        await this.ensureSampleData();
      }

      await this.ui.renderDashboard();
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  async runAutoCleanup() {
    try {
      const result = await db.performAutoCleanup(30);
      const totalDeleted = result.deletedDocsCount + result.deletedFoldersCount;
      if (totalDeleted > 0) {
        const banner = document.getElementById('cleanupNoticeBanner');
        const textEl = document.getElementById('cleanupNoticeText');
        if (banner && textEl) {
          textEl.textContent = `🧹 Pembersihan Otomatis: ${totalDeleted} dokumen/folder yang tidak pernah dibuka selama 1 bulan telah dihapus secara otomatis.`;
          banner.classList.remove('hidden');
        }
      }
    } catch (e) {
      console.warn('Auto cleanup error:', e);
    }
  }
    const updateTime = () => {
      const clockEl = document.getElementById('clockTime');
      if (!clockEl) return;
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      clockEl.textContent = `${hrs}:${mins}:${secs}`;
    };

    updateTime();
    setInterval(updateTime, 1000);
  }

  setupTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateThemeIcon();
  }

  toggleTheme() {
    const themes = ['auto', 'light', 'dark'];
    const nextIndex = (themes.indexOf(this.currentTheme) + 1) % themes.length;
    this.currentTheme = themes[nextIndex];
    localStorage.setItem('caridata_theme', this.currentTheme);
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    this.updateThemeIcon();
  }

  updateThemeIcon() {
    const iconBox = document.getElementById('themeIconBox');
    const textLabel = document.getElementById('themeTextLabel');

    if (this.currentTheme === 'auto') {
      if (iconBox) iconBox.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16z"/><path d="M12 4v16a8 8 0 0 0 0-16z"/></svg>`;
      if (textLabel) textLabel.textContent = 'Auto';
    } else if (this.currentTheme === 'light') {
      if (iconBox) iconBox.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
      if (textLabel) textLabel.textContent = 'Terang';
    } else {
      if (iconBox) iconBox.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      if (textLabel) textLabel.textContent = 'Gelap';
    }
  }

  setupPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('ServiceWorker registered:', reg.scope))
        .catch(err => console.warn('ServiceWorker registration failed:', err));
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const nativeBtn = document.getElementById('triggerNativeInstallBtn');
      if (nativeBtn) nativeBtn.style.display = 'inline-block';
    });
  }

  async installPWA() {
    if (this.deferredInstallPrompt) {
      this.deferredInstallPrompt.prompt();
      const choice = await this.deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') console.log('Pengguna menyetujui PWA');
      this.deferredInstallPrompt = null;
    } else {
      document.getElementById('installGuideModal')?.classList.add('active');
    }
  }

  async syncFromMasterSheet(masterUrl) {
    if (!masterUrl) return;
    try {
      const docs = await DocumentParser.parseMasterIndexSheet(masterUrl);
      if (docs && docs.length > 0) {
        for (const doc of docs) {
          doc.folderId = this.currentFolderId;
          await db.saveDocument(doc);
        }
      }
    } catch (err) {
      console.warn('Master sheet sync error:', err);
    }
  }

  async handleUrlQueryImport() {
    const params = new URLSearchParams(window.location.search);
    let docUrl = params.get('url') || params.get('sheet') || '';
    const b64 = params.get('b64');
    const docTitle = params.get('title') || '';

    if (b64) {
      try { docUrl = atob(b64); } catch { docUrl = decodeURIComponent(b64); }
    }

    if (docUrl) {
      try {
        const docData = await DocumentParser.parseFromUrl(docUrl, docTitle);
        await db.saveDocument(docData);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.warn('URL auto-import failed:', err);
      }
    }
  }

  async ensureSampleData() {
    const existing = await db.getAllDocuments();
    if (existing.length === 0) {
      try {
        const res = await fetch('./data/default_documents.json');
        if (res.ok) {
          const defaultData = await res.json();
          if (defaultData && defaultData.documents) {
            for (const doc of defaultData.documents) {
              await db.saveDocument(doc);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load default static documents:', e);
      }
    }
  }

  bindEvents() {
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('installAppBtn')?.addEventListener('click', () => this.installPWA());

    // Folder Actions
    document.getElementById('addFolderBtn')?.addEventListener('click', () => this.openFolderModal());
    document.getElementById('closeFolderModalBtn')?.addEventListener('click', () => this.closeFolderModal());
    document.getElementById('cancelFolderModalBtn')?.addEventListener('click', () => this.closeFolderModal());
    document.getElementById('addFolderForm')?.addEventListener('submit', (e) => this.handleAddFolderSubmit(e));

    // Security PIN Modal
    document.getElementById('closePinModalBtn')?.addEventListener('click', () => {
      document.getElementById('securityPinModal')?.classList.remove('active');
    });
    document.getElementById('cancelPinModalBtn')?.addEventListener('click', () => {
      document.getElementById('securityPinModal')?.classList.remove('active');
    });
    document.getElementById('securityPinForm')?.addEventListener('submit', (e) => this.verifyPinSubmit(e));

    // Master Sheet Cloud Settings Modal
    document.getElementById('masterSheetBtn')?.addEventListener('click', () => this.ui.openMasterModal());
    document.getElementById('closeMasterModalBtn')?.addEventListener('click', () => this.ui.closeMasterModal());
    document.getElementById('cancelMasterModalBtn')?.addEventListener('click', () => this.ui.closeMasterModal());
    document.getElementById('masterSheetForm')?.addEventListener('submit', (e) => this.ui.handleMasterSubmit(e));
    document.getElementById('clearMasterBtn')?.addEventListener('click', () => this.ui.clearMasterSheetSettings());

    // Sync Cloud Hero Button
    document.getElementById('syncCloudBtn')?.addEventListener('click', async () => {
      const syncBtn = document.getElementById('syncCloudBtn');
      if (syncBtn) syncBtn.style.opacity = '0.5';
      if (this.masterSheetUrl) {
        await this.syncFromMasterSheet(this.masterSheetUrl);
        await this.ui.renderDashboard();
        alert('✅ Data berhasil disinkronkan dari Master Cloud!');
      } else {
        this.ui.openMasterModal();
      }
      if (syncBtn) syncBtn.style.opacity = '1';
    });

    // Add Document Modal
    document.getElementById('addDocBtn')?.addEventListener('click', () => this.openAddModal());
    document.getElementById('closeModalBtn')?.addEventListener('click', () => this.closeAddModal());
    document.getElementById('cancelModalBtn')?.addEventListener('click', () => this.closeAddModal());
    document.getElementById('addDocForm')?.addEventListener('submit', (e) => this.handleAddDocumentSubmit(e));

    // Install Guide Modal Close Buttons
    const closeInstall = () => document.getElementById('installGuideModal')?.classList.remove('active');
    document.getElementById('closeInstallModalBtn')?.addEventListener('click', closeInstall);
    document.getElementById('closeInstallGuideBtn')?.addEventListener('click', closeInstall);
    document.getElementById('triggerNativeInstallBtn')?.addEventListener('click', () => {
      closeInstall();
      this.installPWA();
    });

    // Network Status Modal Handlers
    document.getElementById('dismissNetworkModalBtn')?.addEventListener('click', () => this.ui.hideNetworkModal());
    document.getElementById('retryConnectionBtn')?.addEventListener('click', async () => {
      const retryBtn = document.getElementById('retryConnectionBtn');
      if (retryBtn) retryBtn.innerHTML = `<div class="spinner"></div> Memeriksa...`;
      const isOk = await this.ui.checkNetworkStatus(true);
      if (retryBtn) retryBtn.innerHTML = `Coba Lagi 🔄`;
      if (isOk) {
        this.ui.hideNetworkModal();
        if (this.masterSheetUrl) {
          await this.syncFromMasterSheet(this.masterSheetUrl);
          await this.ui.renderDashboard();
        }
      }
    });

    window.addEventListener('offline', () => this.ui.checkNetworkStatus(false));
    window.addEventListener('online', () => this.ui.hideNetworkModal());

    // Viewer Navigation & Search
    document.getElementById('backToDashboardBtn')?.addEventListener('click', () => this.viewer.showDashboardView());
    document.getElementById('refreshCurrentDocBtn')?.addEventListener('click', () => this.refreshCurrentDocument());

    const searchInput = document.getElementById('searchInput');
    const searchClearBtn = document.getElementById('searchClearBtn');
    const columnFilter = document.getElementById('columnFilterSelect');

    searchInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (searchClearBtn) {
        if (val.length > 0) searchClearBtn.classList.add('active');
        else searchClearBtn.classList.remove('active');
      }
      this.viewer.handleSearch();
    });

    searchClearBtn?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchClearBtn.classList.remove('active');
        this.viewer.handleSearch();
        searchInput.focus();
      }
    });

    columnFilter?.addEventListener('change', () => this.viewer.handleSearch());

    // Pagination
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
      searchEngine.setPage(searchEngine.currentPage - 1);
      this.viewer.renderTablePage();
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
      searchEngine.setPage(searchEngine.currentPage + 1);
      this.viewer.renderTablePage();
    });
  }

  openFolderModal() {
    document.getElementById('addFolderModal')?.classList.add('active');
    document.getElementById('folderNameInput')?.focus();
  }

  closeFolderModal() {
    document.getElementById('addFolderModal')?.classList.remove('active');
    const form = document.getElementById('addFolderForm');
    if (form) form.reset();
  }

  async handleAddFolderSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('folderNameInput');
    const pinInput = document.getElementById('folderPinInput');
    const name = nameInput ? nameInput.value.trim() : '';
    const pin = pinInput ? pinInput.value.trim() : '';

    if (!name) return;

    const folder = {
      id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name: name,
      pinHash: pin || null,
      parentId: this.currentFolderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };

    await db.saveFolder(folder);
    this.closeFolderModal();
    await this.ui.renderDashboard();
  }

  async navigateToFolder(folderId) {
    if (folderId) {
      const folder = await db.getFolderById(folderId);
      if (folder && folder.pinHash) {
        this.ui.requestPinAuth(folder.name, folder.pinHash, async () => {
          this.currentFolderId = folderId;
          this.currentFolder = folder;
          await this.ui.renderDashboard();
        });
        return;
      }
      this.currentFolderId = folderId;
      this.currentFolder = folder;
    } else {
      this.currentFolderId = null;
      this.currentFolder = null;
    }
    await this.ui.renderDashboard();
  }

  verifyPinSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('securityPinInput');
    const errText = document.getElementById('pinErrorMessage');
    const entered = input ? input.value.trim() : '';

    if (entered === this.pendingPinTargetHash) {
      document.getElementById('securityPinModal')?.classList.remove('active');
      const callback = this.pendingPinCallback;
      this.pendingPinCallback = null;
      this.pendingPinTargetHash = null;
      if (callback) callback();
    } else {
      if (errText) errText.style.display = 'block';
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }

  openAddModal() {
    document.getElementById('addDocModal')?.classList.add('active');
    document.getElementById('docUrlInput')?.focus();
  }

  closeAddModal() {
    document.getElementById('addDocModal')?.classList.remove('active');
    const form = document.getElementById('addDocForm');
    if (form) form.reset();
  }

  async handleAddDocumentSubmit(e) {
    e.preventDefault();
    const urlInput = document.getElementById('docUrlInput');
    const titleInput = document.getElementById('docTitleInput');
    const pinInput = document.getElementById('docPinInput');
    const submitBtn = document.getElementById('saveDocBtn');

    const url = urlInput ? urlInput.value.trim() : '';
    const customTitle = titleInput ? titleInput.value.trim() : '';
    const pin = pinInput ? pinInput.value.trim() : '';

    if (!url) return;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<div class="spinner"></div> Mengunduh...`;

      const docData = await DocumentParser.parseFromUrl(url, customTitle);
      docData.folderId = this.currentFolderId;
      docData.pinHash = pin || null;

      await db.saveDocument(docData);

      // Auto-write to Master Google Sheet if Webhook URL is configured
      if (CONFIG.MASTER_WEBHOOK_URL) {
        try {
          fetch(CONFIG.MASTER_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: docData.id,
              name: docData.name,
              url: url,
              color: docData.badgeColor
            })
          }).catch(() => {});
        } catch (e) {}
      }

      this.closeAddModal();
      await this.ui.renderDashboard();
      this.openDocument(docData.id);
    } catch (err) {
      alert(`Gagal memproses link dokumen:\n${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Simpan Dokumen`;
    }
  }

  async refreshCurrentDocument() {
    if (!this.activeDocument || !this.activeDocument.sourceUrl) {
      alert('Dokumen ini adalah data lokal dan tidak terhubung ke link spreadsheet publik.');
      return;
    }
    const refreshBtn = document.getElementById('refreshCurrentDocBtn');
    try {
      if (refreshBtn) refreshBtn.style.opacity = '0.5';
      const updatedDoc = await DocumentParser.parseFromUrl(
        this.activeDocument.sourceUrl,
        this.activeDocument.name,
        this.activeDocument.id
      );
      updatedDoc.folderId = this.activeDocument.folderId;
      updatedDoc.pinHash = this.activeDocument.pinHash;

      await db.saveDocument(updatedDoc);
      this.activeDocument = updatedDoc;
      searchEngine.setDocument(updatedDoc);

      const titleEl = document.getElementById('viewerDocTitle');
      if (titleEl) titleEl.textContent = updatedDoc.name;

      this.viewer.handleSearch();
      alert(`✅ Data berhasil diperbarui langsung dari Google Sheets! (${updatedDoc.rowCount} baris)`);
    } catch (err) {
      alert(`Tidak dapat menyegarkan data live:\n${err.message}`);
    } finally {
      if (refreshBtn) refreshBtn.style.opacity = '1';
    }
  }

  openDocument(id) {
    this.viewer.openDocument(id);
  }

  handleSort(colIdx) {
    this.viewer.handleSort(colIdx);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
