/**
 * High-performance search and virtualized data table rendering engine.
 */

export class SearchEngine {
  constructor() {
    this.currentDoc = null;
    this.filteredIndices = []; // Array of matching row indices
    this.searchTerm = '';
    this.selectedColumnIndex = -1; // -1 means search all columns
    this.currentPage = 1;
    this.pageSize = 50; // Render in light chunks for low-spec performance
    this.sortColumn = -1;
    this.sortAscending = true;
  }

  setDocument(doc) {
    this.currentDoc = doc;
    this.searchTerm = '';
    this.selectedColumnIndex = -1;
    this.currentPage = 1;
    this.sortColumn = -1;
    this.sortAscending = true;
    this.resetFilter();
  }

  resetFilter() {
    if (!this.currentDoc) {
      this.filteredIndices = [];
      return;
    }
    this.filteredIndices = Array.from({ length: this.currentDoc.rows.length }, (_, i) => i);
  }

  search(query = '', colIndex = -1) {
    this.searchTerm = query.trim().toLowerCase();
    this.selectedColumnIndex = parseInt(colIndex, 10);
    this.currentPage = 1;

    if (!this.currentDoc || !this.currentDoc.rows) {
      this.filteredIndices = [];
      return 0;
    }

    if (!this.searchTerm) {
      this.resetFilter();
      if (this.sortColumn !== -1) {
        this.applySort();
      }
      return this.filteredIndices.length;
    }

    const keywords = this.searchTerm.split(/\s+/).filter(k => k.length > 0);
    const rows = this.currentDoc.rows;
    const matches = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let isMatch = false;

      if (this.selectedColumnIndex >= 0) {
        // Search specific column
        const cellValue = (row[this.selectedColumnIndex] || '').toLowerCase();
        isMatch = keywords.every(kw => cellValue.includes(kw));
      } else {
        // Search all columns
        const rowString = row.join(' ').toLowerCase();
        isMatch = keywords.every(kw => rowString.includes(kw));
      }

      if (isMatch) {
        matches.push(i);
      }
    }

    this.filteredIndices = matches;

    if (this.sortColumn !== -1) {
      this.applySort();
    }

    return this.filteredIndices.length;
  }

  sortByColumn(colIndex) {
    if (this.sortColumn === colIndex) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = colIndex;
      this.sortAscending = true;
    }
    this.applySort();
  }

  applySort() {
    if (this.sortColumn < 0 || !this.currentDoc) return;
    const colIdx = this.sortColumn;
    const rows = this.currentDoc.rows;
    const isAsc = this.sortAscending;

    this.filteredIndices.sort((idxA, idxB) => {
      const valA = (rows[idxA][colIdx] || '').trim();
      const valB = (rows[idxB][colIdx] || '').trim();

      // Check if numeric comparison
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
        return isAsc ? numA - numB : numB - numA;
      }

      return isAsc ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  getCurrentPageData() {
    const totalMatches = this.filteredIndices.length;
    const totalPages = Math.ceil(totalMatches / this.pageSize) || 1;

    // Ensure page bounds
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const endIdx = Math.min(startIdx + this.pageSize, totalMatches);

    const pageIndices = this.filteredIndices.slice(startIdx, endIdx);
    const pageRows = pageIndices.map(idx => ({
      originalIndex: idx + 1, // 1-based index for row number display
      data: this.currentDoc.rows[idx]
    }));

    return {
      rows: pageRows,
      totalMatches: totalMatches,
      startItem: totalMatches === 0 ? 0 : startIdx + 1,
      endItem: endIdx,
      currentPage: this.currentPage,
      totalPages: totalPages
    };
  }

  setPage(page) {
    this.currentPage = page;
  }

  setPageSize(size) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  /**
   * Escape HTML special chars and highlight search terms in output string
   */
  static highlightText(text, searchStr) {
    if (!text) return '';
    const escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    if (!searchStr || !searchStr.trim()) {
      return escaped;
    }

    const keywords = searchStr.trim().split(/\s+/).filter(k => k.length > 0);
    if (keywords.length === 0) return escaped;

    // Build regex pattern matching any keyword
    const pattern = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return escaped.replace(pattern, '<mark class="highlight">$1</mark>');
  }
}

export const searchEngine = new SearchEngine();
