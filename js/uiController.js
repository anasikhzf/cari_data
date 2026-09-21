import { db } from './db.js';
import { DocumentParser } from './parser.js';
import { CONFIG } from '../data/config.js';

export class UIController {
  constructor(app) {
    this.app = app;
  }

  async checkNetworkStatus(showIfSlow = true) {
    if (!navigator.onLine) {
      this.showNetworkModal('⚠️ Perangkat Offline', 'Aplikasi ini membutuhkan koneksi internet untuk menyinkronkan data live. Anda saat ini sedang luring (offline).');
      return false;
    }

    if (showIfSlow) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        await fetch('./manifest.json', { cache: 'no-store', signal: controller.signal });
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        if (latency > 3000) {
          this.showNetworkModal('⚠️ Koneksi Internet Lambat', `Waktu respon jaringan terdeteksi cukup lambat (${latency}ms). Sinkronisasi data live memerlukan waktu lebih lama.`);
          return false;
        }
      } catch (err) {
        if (!navigator.onLine || err.name === 'AbortError') {
          this.showNetworkModal('⚠️ Koneksi Terputus / Lambat', 'Tidak dapat terhubung ke internet secara cepat. Pastikan koneksi internet HP Anda terhubung.');
          return false;
        }
      }
    }
    return true;
  }

  showNetworkModal(title, desc) {
    const modal = document.getElementById('networkStatusModal');
    const titleEl = document.getElementById('networkModalTitle');
    const descEl = document.getElementById('networkModalDesc');
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (modal) modal.classList.add('active');
  }

  hideNetworkModal() {
    document.getElementById('networkStatusModal')?.classList.remove('active');
  }

  /* -------------------------------------------------------------------------- */
  /* Dashboard Breadcrumb Navigation                                            */
  /* -------------------------------------------------------------------------- */
  updateBreadcrumb() {
    const nav = document.getElementById('dashboardBreadcrumb');
    const titleEl = document.getElementById('dashboardFolderTitle');
    const subtitleEl = document.getElementById('dashboardFolderSubtitle');
    if (!nav) return;

    if (!this.app.currentFolderId) {
      nav.innerHTML = `<span class="breadcrumb-item active" onclick="window.app.navigateToFolder(null)">🏠 Beranda Utama</span>`;
      if (titleEl) titleEl.textContent = 'Penyimpanan Dokumen & Folder';
      if (subtitleEl) subtitleEl.textContent = 'Kelola folder, kunci file dengan PIN, dan cari data spreadsheet masif secara cepat.';
    } else {
      const folderName = this.app.currentFolder ? this.app.currentFolder.name : 'Folder';
      nav.innerHTML = `
        <span class="breadcrumb-item" onclick="window.app.navigateToFolder(null)">🏠 Beranda</span>
        <span class="breadcrumb-separator">&rsaquo;</span>
        <span class="breadcrumb-item active">📁 ${folderName}</span>
      `;
      if (titleEl) titleEl.textContent = `Folder: ${folderName}`;
      if (subtitleEl) subtitleEl.textContent = `Menampilkan file & dokumen di dalam folder "${folderName}".`;
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Render Dashboard Grid (Folders & Documents)                                */
  /* -------------------------------------------------------------------------- */
  async renderDashboard() {
    this.updateBreadcrumb();
    const grid = document.getElementById('documentsGrid');
    if (!grid) return;

    const allFolders = await db.getAllFolders();
    const currentFolders = allFolders.filter(f => (!this.app.currentFolderId && !f.parentId) || f.parentId === this.app.currentFolderId);
    const currentDocs = await db.getAllDocuments(this.app.currentFolderId || 'ROOT');

    if (currentFolders.length === 0 && currentDocs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="14"/></svg>
          </div>
          <h3>Folder ini kosong</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary); max-width:320px;">
            Klik "+ Tambah Dokumen" atau "+ Folder" untuk menambahkan berkas baru.
          </p>
        </div>
      `;
      return;
    }

    let html = '';

    // Render Folders
    currentFolders.forEach(folder => {
      const isLocked = Boolean(folder.pinHash);
      html += `
        <div class="doc-card folder-card" onclick="window.app.navigateToFolder('${folder.id}')">
          <div class="doc-card-header">
            <div class="doc-badge" style="background-color:#f59e0b;">
              📁
            </div>
            <div class="doc-actions-menu">
              ${isLocked ? `<span class="lock-indicator-badge" title="Folder Terkunci PIN">🔐</span>` : ''}
              <button class="card-btn-danger delete-folder-btn" data-id="${folder.id}" data-name="${folder.name}" data-pin="${folder.pinHash || ''}" title="Hapus Folder">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <div class="doc-card-body">
            <div class="doc-title">${folder.name}</div>
            <div class="doc-meta">
              <span>📂 Folder Penyimpanan</span>
            </div>
          </div>
          <div class="doc-card-footer">
            <span>${isLocked ? '🔒 Terkunci PIN' : '🔓 Publik'}</span>
            <span class="doc-open-btn">Buka &rarr;</span>
          </div>
        </div>
      `;
    });

    // Render Documents
    currentDocs.forEach(doc => {
      const isLocked = Boolean(doc.pinHash);
      const updatedDate = new Date(doc.updatedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      html += `
        <div class="doc-card" data-id="${doc.id}">
          <div class="doc-card-header">
            <div class="doc-badge" style="background-color:${doc.badgeColor || '#2563eb'};">
              📄
            </div>
            <div class="doc-actions-menu">
              ${isLocked ? `<span class="lock-indicator-badge" title="File Terkunci PIN">🔐</span>` : ''}
              <button class="card-btn-danger share-doc-btn" data-url="${doc.sourceUrl || ''}" data-title="${doc.name}" title="Bagikan Link Dokumen">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
              <button class="card-btn-danger delete-doc-btn" data-id="${doc.id}" data-name="${doc.name}" data-pin="${doc.pinHash || ''}" title="Hapus Dokumen">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <div class="doc-card-body" onclick="window.app.openDocument('${doc.id}')">
            <div class="doc-title">${doc.name}</div>
            <div class="doc-meta">
              <span>📊 ${doc.rowCount.toLocaleString('id-ID')} baris</span>
              <span>📋 ${doc.colCount} kolom</span>
            </div>
          </div>
          <div class="doc-card-footer" onclick="window.app.openDocument('${doc.id}')">
            <span>📅 ${updatedDate}</span>
            <span class="doc-open-btn">${isLocked ? '🔒 Buka' : 'Buka &rarr;'}</span>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;

    // Attach Action Handlers
    grid.querySelectorAll('.delete-folder-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const pin = btn.getAttribute('data-pin');
        this.confirmDeleteFolder(id, name, pin);
      });
    });

    grid.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const pin = btn.getAttribute('data-pin');
        this.confirmDeleteDocument(id, name, pin);
      });
    });

    grid.querySelectorAll('.share-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.getAttribute('data-url');
        const title = btn.getAttribute('data-title');
        this.shareDocumentLink(url, title);
      });
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Security PIN Verification System                                           */
  /* -------------------------------------------------------------------------- */
  requestPinAuth(title, expectedPinHash, onSuccessAction) {
    if (!expectedPinHash) {
      onSuccessAction();
      return;
    }

    this.app.pendingPinCallback = onSuccessAction;
    this.app.pendingPinTargetHash = expectedPinHash;

    const modal = document.getElementById('securityPinModal');
    const label = document.getElementById('pinModalTargetLabel');
    const input = document.getElementById('securityPinInput');
    const errText = document.getElementById('pinErrorMessage');

    if (label) label.textContent = `🔐 Kunci Keamanan: "${title}"`;
    if (input) input.value = '';
    if (errText) errText.style.display = 'none';

    if (modal) modal.classList.add('active');
    setTimeout(() => input?.focus(), 100);
  }

  shareDocumentLink(url, title) {
    if (!url) {
      alert('Dokumen ini adalah data lokal tanpa link publik.');
      return;
    }

    const b64 = DocumentParser.obfuscateUrl(url);
    const shareUrl = `${window.location.origin}${window.location.pathname}?b64=${encodeURIComponent(b64)}&title=${encodeURIComponent(title)}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('🔗 Link dokumen terenkripsi berhasil disalin! Link ini aman dan menyembunyikan alamat spreadsheet asli.');
      }).catch(() => {
        prompt('Salin link dokumen berikut:', shareUrl);
      });
    } else {
      prompt('Salin link dokumen berikut:', shareUrl);
    }
  }

  async confirmDeleteDocument(id, name, pinHash) {
    const action = async () => {
      if (confirm(`Apakah Anda yakin ingin menghapus dokumen "${name}"?`)) {
        const doc = await db.getDocumentById(id);
        await db.deleteDocument(id);

        // Auto-delete from Master Google Sheet if Webhook URL is configured
        if (CONFIG && CONFIG.MASTER_WEBHOOK_URL) {
          try {
            fetch(CONFIG.MASTER_WEBHOOK_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'delete',
                id: id,
                name: name,
                url: doc ? doc.sourceUrl : ''
              })
            }).catch(() => {});
          } catch (e) {}
        }

        await this.renderDashboard();
      }
    };

    if (pinHash) {
      this.requestPinAuth(name, pinHash, action);
    } else {
      action();
    }
  }

  async confirmDeleteFolder(id, name, pinHash) {
    const action = async () => {
      if (confirm(`Apakah Anda yakin ingin menghapus folder "${name}"? Seluruh dokumen di dalamnya akan dipindahkan ke Beranda Utama.`)) {
        await db.deleteFolder(id);
        if (this.app.currentFolderId === id) {
          this.app.currentFolderId = null;
        }
        await this.renderDashboard();
      }
    };

    if (pinHash) {
      this.requestPinAuth(name, pinHash, action);
    } else {
      action();
    }
  }

  openMasterModal() {
    const input = document.getElementById('masterUrlInput');
    if (input) input.value = this.app.masterSheetUrl;
    document.getElementById('masterSheetModal')?.classList.add('active');
    input?.focus();
  }

  closeMasterModal() {
    document.getElementById('masterSheetModal')?.classList.remove('active');
  }

  async handleMasterSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('masterUrlInput');
    const saveBtn = document.getElementById('saveMasterBtn');
    const url = input ? input.value.trim() : '';
    if (!url) return;

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<div class="spinner"></div> Menyinkronkan...`;
      }
      this.app.masterSheetUrl = url;
      localStorage.setItem('caridata_master_sheet_url', url);

      await this.app.syncFromMasterSheet(url);
      this.closeMasterModal();
      await this.renderDashboard();
      alert('✅ Berhasil terhubung ke Master Google Sheet!');
    } catch (err) {
      alert(`Gagal menghubungkan ke Master Google Sheet:\n${err.message}`);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `Simpan & Sinkronkan`;
      }
    }
  }

  async clearMasterSheetSettings() {
    if (confirm('Apakah Anda yakin ingin menghapus tautan Master Google Sheet Cloud dari perangkat ini?')) {
      this.app.masterSheetUrl = '';
      localStorage.removeItem('caridata_master_sheet_url');
      this.closeMasterModal();
      alert('Tautan Master Sheet berhasil direset.');
    }
  }
}
