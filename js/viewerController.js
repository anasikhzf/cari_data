import { db } from './db.js';
import { DocumentParser } from './parser.js';
import { SearchEngine, searchEngine } from './searchEngine.js';

export class ViewerController {
  constructor(app) {
    this.app = app;
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

    const loadDocView = () => {
      this.app.activeDocument = doc;
      searchEngine.setDocument(doc);

      document.getElementById('dashboardView')?.classList.add('hidden');
      document.getElementById('documentViewerContainer')?.classList.remove('hidden');

      const titleEl = document.getElementById('viewerDocTitle');
      if (titleEl) titleEl.textContent = doc.name;

      const select = document.getElementById('columnFilterSelect');
      if (select) {
        select.innerHTML = `<option value="-1">Semua Kolom</option>` +
          doc.headers.map((h, idx) => `<option value="${idx}">Kolom: ${h}</option>`).join('');
      }

      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = '';
      document.getElementById('searchClearBtn')?.classList.remove('active');

      this.renderTableHeader(doc.headers);
      this.handleSearch();

      if (doc.sourceUrl && doc.sourceUrl.startsWith('http')) {
        DocumentParser.parseFromUrl(doc.sourceUrl, doc.name, doc.id)
          .then(async (freshDoc) => {
            freshDoc.folderId = doc.folderId;
            freshDoc.pinHash = doc.pinHash;
            if (freshDoc.rowCount !== doc.rowCount || freshDoc.updatedAt !== doc.updatedAt) {
              await db.saveDocument(freshDoc);
              if (this.app.activeDocument && this.app.activeDocument.id === doc.id) {
                this.app.activeDocument = freshDoc;
                searchEngine.setDocument(freshDoc);
                if (titleEl) titleEl.textContent = freshDoc.name;
                this.handleSearch();
              }
            }
          })
          .catch(() => {});
      }
    };

    if (doc.pinHash) {
      this.app.ui.requestPinAuth(doc.name, doc.pinHash, loadDocView);
    } else {
      loadDocView();
    }
  }

  showDashboardView() {
    document.getElementById('documentViewerContainer')?.classList.add('hidden');
    document.getElementById('dashboardView')?.classList.remove('hidden');
    this.app.activeDocument = null;
    this.app.ui.renderDashboard();
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
    if (this.app.activeDocument) {
      this.app.activeDocument.headers.forEach((_, i) => {
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
    if (statsEl && this.app.activeDocument) {
      if (query.trim().length > 0) {
        statsEl.textContent = `${totalMatches.toLocaleString('id-ID')} / ${this.app.activeDocument.rowCount.toLocaleString('id-ID')} baris`;
      } else {
        statsEl.textContent = `Total: ${this.app.activeDocument.rowCount.toLocaleString('id-ID')} baris`;
      }
    }

    this.renderTablePage();
  }

  renderTablePage() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    const pageData = searchEngine.getCurrentPageData();

    if (pageData.rows.length === 0) {
      const colCount = (this.app.activeDocument ? this.app.activeDocument.headers.length : 1) + 1;
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

    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
      paginationInfo.textContent = `Hal ${pageData.currentPage}/${pageData.totalPages} (${pageData.startItem}-${pageData.endItem})`;
    }

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (prevBtn) prevBtn.disabled = pageData.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = pageData.currentPage >= pageData.totalPages;
  }
}
