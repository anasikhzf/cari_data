import { db } from './db.js';
import { DocumentParser } from './parser.js';
import { SearchEngine, searchEngine } from './searchEngine.js';

class App {
  constructor() {
    this.currentTheme = localStorage.getItem('caridata_theme') || 'auto';
    this.deferredInstallPrompt = null;
    this.activeDocument = null;

    this.init();
  }

  async init() {
    this.setupTheme();
    this.setupPWA();
    this.bindEvents();

    try {
      await db.init();
      await this.ensureSampleData();
      await this.renderDashboard();
    } catch (err) {
      console.error('Initialization error:', err);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Theme Switcher (Auto, Light, Dark - Icons Only)                            */
  /* -------------------------------------------------------------------------- */
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
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;

    if (this.currentTheme === 'auto') {
      if (iconBox) iconBox.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16z"/><path d="M12 4v16a8 8 0 0 0 0-16z"/></svg>`;
      if (textLabel) textLabel.textContent = 'Tema: Otomatis';
      btn.setAttribute('title', 'Tema: Otomatis (Mengikuti Sistem HP/Laptop)');
    } else if (this.currentTheme === 'light') {
      if (iconBox) iconBox.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
      if (textLabel) textLabel.textContent = 'Tema: Terang';
      btn.setAttribute('title', 'Tema: Mode Terang (Layar Putih)');
    } else {
      if (iconBox) iconBox.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
      if (textLabel) textLabel.textContent = 'Tema: Gelap';
      btn.setAttribute('title', 'Tema: Mode Gelap (Layar Hitam)');
    }
  }

  /* -------------------------------------------------------------------------- */
  /* PWA Registration & Install Modal Handler                                   */
  /* -------------------------------------------------------------------------- */
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
      if (choice.outcome === 'accepted') {
        console.log('Pengguna menyetujui instalasi PWA');
      }
      this.deferredInstallPrompt = null;
    } else {
      alert('Aplikasi CariData sudah terpasang di Layar Utama HP/Komputer Anda, atau gunakan menu browser "Tambahkan ke Layar Utama".');
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Default Sample Data Generator for Immediate Testing                        */
  /* -------------------------------------------------------------------------- */
  async ensureSampleData() {
    const existing = await db.getAllDocuments();
    if (existing.length === 0) {
      const sampleHeaders = ['ID', 'Nama Barang / Layanan', 'Kategori', 'Stok', 'Harga Satuan', 'Lokasi Rak', 'Status'];
      const categories = ['Elektronik', 'Alat Tulis', 'Aksesoris', 'Komputer', 'Jaringan', 'Perlengkapan Kantor'];
      const sampleRows = [];

      for (let i = 1; i <= 250; i++) {
        const cat = categories[i % categories.length];
        const stok = Math.floor(Math.random() * 500) + 5;
        const harga = (Math.floor(Math.random() * 150) + 10) * 5000;
        const hargaFormatted = 'Rp ' + harga.toLocaleString('id-ID');
        const rak = `Rak ${String.fromCharCode(65 + (i % 6))}-${(i % 10) + 1}`;
        const status = stok < 20 ? 'Stok Penipisan' : 'Tersedia';

        sampleRows.push([
          `BRG-${1000 + i}`,
          `Item Contoh ${i} (${cat})`,
          cat,
          stok.toString(),
          hargaFormatted,
          rak,
          status
        ]);
      }

      const sampleDoc = {
        id: 'doc_sample_inventory',
        name: 'Sampel Inventory Data (250 Item)',
        sourceUrl: '',
        headers: sampleHeaders,
        rows: sampleRows,
        rowCount: sampleRows.length,
        colCount: sampleHeaders.length,
        updatedAt: new Date().toISOString(),
        badgeColor: '#2563eb'
      };

      await db.saveDocument(sampleDoc);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Event Listeners & UI Binding                                               */
  /* -------------------------------------------------------------------------- */
  bindEvents() {
    // Header Buttons
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());
    document.getElementById('installAppBtn')?.addEventListener('click', () => this.installPWA());
    document.getElementById('addDocBtn')?.addEventListener('click', () => this.openAddModal());

    // Add Document Modal
    document.getElementById('closeModalBtn')?.addEventListener('click', () => this.closeAddModal());
    document.getElementById('cancelModalBtn')?.addEventListener('click', () => this.closeAddModal());
    document.getElementById('addDocForm')?.addEventListener('submit', (e) => this.handleAddDocumentSubmit(e));

    // Viewer Navigation, Refresh & Search
    document.getElementById('backToDashboardBtn')?.addEventListener('click', () => this.showDashboardView());
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
      this.handleSearch();
    });

    searchClearBtn?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchClearBtn.classList.remove('active');
        this.handleSearch();
        searchInput.focus();
      }
    });

    columnFilter?.addEventListener('change', () => this.handleSearch());

    // Pagination
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
      searchEngine.setPage(searchEngine.currentPage - 1);
      this.renderTablePage();
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
      searchEngine.setPage(searchEngine.currentPage + 1);
      this.renderTablePage();
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Render Dashboard (Grid of File Cards - 2 Columns on Mobile)               */
  /* -------------------------------------------------------------------------- */
  async renderDashboard() {
    const grid = document.getElementById('documentsGrid');
    if (!grid) return;

    const docs = await db.getAllDocuments();

    if (docs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
          </div>
          <h3>Belum ada dokumen</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary); max-width:300px;">
            Klik tombol "+ Tambah Link Dokumen" untuk memasukkan link Google Sheets atau CSV.
          </p>
        </div>
      `;
      return;
    }

    grid.innerHTML = docs.map(doc => {
      const updatedDate = new Date(doc.updatedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="doc-card" data-id="${doc.id}">
          <div class="doc-card-header">
            <div class="doc-badge" style="background-color:${doc.badgeColor || '#2563eb'};">
              📄
            </div>
            <div class="doc-actions-menu">
              <button class="card-btn-danger delete-doc-btn" data-id="${doc.id}" title="Hapus Dokumen">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <div class="doc-card-body" onclick="window.app.openDocument('${doc.id}')">
            <div class="doc-title">${doc.name}</div>
            <div class="doc-meta">
              <span>📊 ${doc.rowCount.toLocaleString('id-ID')} baris data</span>
              <span>📋 ${doc.colCount} kolom</span>
            </div>
          </div>
          <div class="doc-card-footer" onclick="window.app.openDocument('${doc.id}')">
            <span>📅 ${updatedDate}</span>
            <span class="doc-open-btn">Buka &rarr;</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach delete handlers
    grid.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const docId = btn.getAttribute('data-id');
        this.confirmDeleteDocument(docId);
      });
    });
  }

  /* -------------------------------------------------------------------------- */
  /* Add Document Modal Handlers                                                */
  /* -------------------------------------------------------------------------- */
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
    const submitBtn = document.getElementById('saveDocBtn');

    const url = urlInput ? urlInput.value.trim() : '';
    const customTitle = titleInput ? titleInput.value.trim() : '';

    if (!url) return;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<div class="spinner"></div> Mengunduh Nama & Data...`;

      const docData = await DocumentParser.parseFromUrl(url, customTitle);
      await db.saveDocument(docData);

      this.closeAddModal();
      await this.renderDashboard();
      this.openDocument(docData.id);
    } catch (err) {
      alert(`Gagal memproses link dokumen:\n${err.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Simpan Dokumen`;
    }
  }

  async confirmDeleteDocument(id) {
    if (confirm('Apakah Anda yakin ingin menghapus dokumen ini dari penyimpanan lokal?')) {
      await db.deleteDocument(id);
      await this.renderDashboard();
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Live Data Sync & Document Refresh                                          */
  /* -------------------------------------------------------------------------- */
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

      await db.saveDocument(updatedDoc);
      this.activeDocument = updatedDoc;
      searchEngine.setDocument(updatedDoc);

      const titleEl = document.getElementById('viewerDocTitle');
      if (titleEl) titleEl.textContent = updatedDoc.name;

      this.handleSearch();
      alert(`✅ Data berhasil diperbarui langsung dari Google Sheets! (${updatedDoc.rowCount} baris)`);
    } catch (err) {
      console.warn('Live refresh failed:', err);
      alert(`Tidak dapat menyegarkan data live:\n${err.message}`);
    } finally {
      if (refreshBtn) refreshBtn.style.opacity = '1';
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Document Viewer & Search Controller                                        */
  /* -------------------------------------------------------------------------- */
  async openDocument(id) {
    let doc = await db.getDocumentById(id);
    if (!doc) {
      alert('Dokumen tidak ditemukan.');
      return;
    }

    this.activeDocument = doc;
    searchEngine.setDocument(doc);

    // Setup UI
    document.getElementById('dashboardView')?.classList.add('hidden');
    document.getElementById('documentViewerContainer')?.classList.remove('hidden');

    const titleEl = document.getElementById('viewerDocTitle');
    if (titleEl) titleEl.textContent = doc.name;

    // Populate Column Filter Options
    const select = document.getElementById('columnFilterSelect');
    if (select) {
      select.innerHTML = `<option value="-1">Semua Kolom</option>` +
        doc.headers.map((h, idx) => `<option value="${idx}">Kolom: ${h}</option>`).join('');
    }

    // Reset search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    document.getElementById('searchClearBtn')?.classList.remove('active');

    // Render Table Header
    this.renderTableHeader(doc.headers);
    this.handleSearch();

    // Background Auto Live Sync if web sourceUrl exists
    if (doc.sourceUrl && doc.sourceUrl.startsWith('http')) {
      DocumentParser.parseFromUrl(doc.sourceUrl, doc.name, doc.id)
        .then(async (freshDoc) => {
          if (freshDoc.rowCount !== doc.rowCount || freshDoc.updatedAt !== doc.updatedAt) {
            await db.saveDocument(freshDoc);
            if (this.activeDocument && this.activeDocument.id === doc.id) {
              this.activeDocument = freshDoc;
              searchEngine.setDocument(freshDoc);
              if (titleEl) titleEl.textContent = freshDoc.name;
              this.handleSearch();
            }
          }
        })
        .catch(() => {/* Ignore background silent fail if offline */});
    }
  }

  showDashboardView() {
    document.getElementById('documentViewerContainer')?.classList.add('hidden');
    document.getElementById('dashboardView')?.classList.remove('hidden');
    this.activeDocument = null;
    this.renderDashboard();
  }

  renderTableHeader(headers) {
    const thead = document.getElementById('tableHead');
    if (!thead) return;

    let html = `<tr><th class="row-num-cell">#</th>`;
    headers.forEach((h, idx) => {
      html += `<th onclick="window.app.handleSort(${idx})" title="Klik untuk mengurutkan">${h} <span id="sortIcon_${idx}"></span></th>`;
    });
    html += `</tr>`;
    thead.innerHTML = html;
  }

  handleSort(colIdx) {
    searchEngine.sortByColumn(colIdx);
    if (this.activeDocument) {
      this.activeDocument.headers.forEach((_, i) => {
        const icon = document.getElementById(`sortIcon_${i}`);
        if (icon) icon.textContent = '';
      });
    }
    const targetIcon = document.getElementById(`sortIcon_${colIdx}`);
    if (targetIcon) {
      targetIcon.textContent = searchEngine.sortAscending ? '▲' : '▼';
    }
    this.renderTablePage();
  }

  handleSearch() {
    const query = document.getElementById('searchInput')?.value || '';
    const colIdx = document.getElementById('columnFilterSelect')?.value || -1;

    const totalMatches = searchEngine.search(query, colIdx);

    const statsEl = document.getElementById('searchStats');
    if (statsEl && this.activeDocument) {
      if (query.trim().length > 0) {
        statsEl.textContent = `Ditemukan ${totalMatches.toLocaleString('id-ID')} dari ${this.activeDocument.rowCount.toLocaleString('id-ID')} baris`;
      } else {
        statsEl.textContent = `Total: ${this.activeDocument.rowCount.toLocaleString('id-ID')} baris data`;
      }
    }

    this.renderTablePage();
  }

  renderTablePage() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const pageData = searchEngine.getCurrentPageData();

    if (pageData.rows.length === 0) {
      const colCount = (this.activeDocument ? this.activeDocument.headers.length : 1) + 1;
      tbody.innerHTML = `
        <tr>
          <td colspan="${colCount}" style="text-align:center; padding: 2.5rem 1rem; color:var(--text-muted);">
            🔍 Tidak ada data yang cocok dengan pencarian "${SearchEngine.highlightText(searchEngine.searchTerm)}".
          </td>
        </tr>
      `;
    } else {
      const searchTerm = searchEngine.searchTerm;
      let html = '';

      for (let i = 0; i < pageData.rows.length; i++) {
        const rowObj = pageData.rows[i];
        html += `<tr><td class="row-num-cell">${rowObj.originalIndex}</td>`;

        for (let j = 0; j < rowObj.data.length; j++) {
          const cellVal = rowObj.data[j] || '';
          const highlighted = SearchEngine.highlightText(cellVal, searchTerm);
          html += `<td title="${cellVal}">${highlighted}</td>`;
        }
        html += `</tr>`;
      }

      tbody.innerHTML = html;
    }

    // Update Pagination UI
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
      paginationInfo.textContent = `Halaman ${pageData.currentPage} dari ${pageData.totalPages} (${pageData.startItem}-${pageData.endItem})`;
    }

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (prevBtn) prevBtn.disabled = pageData.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = pageData.currentPage >= pageData.totalPages;
  }
}

// Global instantiation
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
