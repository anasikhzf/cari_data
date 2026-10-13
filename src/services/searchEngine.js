export class SearchEngine {
  constructor() {
    this.currentDoc = null;
    this.filteredIndices = [];
    this.searchTerm = '';
    this.selectedColumnIndex = -1;
    this.currentPage = 1;
    this.pageSize = 50;
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
    if (!this.currentDoc || !this.currentDoc.rows) {
      this.filteredIndices = [];
      return;
    }
    this.filteredIndices = Array.from({ length: this.currentDoc.rows.length }, (_, i) => i);
  }

  search(query = '', colIndex = -1) {
    this.searchTerm = (query || '').trim().toLowerCase();
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
        const cellValue = (row[this.selectedColumnIndex] || '').toLowerCase();
        isMatch = keywords.every(kw => cellValue.includes(kw));
      } else {
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
      let valA = (rows[idxA][colIdx] || '').toString().trim();
      let valB = (rows[idxB][colIdx] || '').toString().trim();

      const numA = parseFloat(valA.replace(/[^\d.-]/g, ''));
      const numB = parseFloat(valB.replace(/[^\d.-]/g, ''));

      if (!isNaN(numA) && !isNaN(numB) && valA === numA.toString() && valB === numB.toString()) {
        return isAsc ? numA - numB : numB - numA;
      }

      const comp = valA.localeCompare(valB, 'id', { numeric: true, sensitivity: 'base' });
      return isAsc ? comp : -comp;
    });
  }

  getTotalPages() {
    if (this.filteredIndices.length === 0) return 1;
    return Math.ceil(this.filteredIndices.length / this.pageSize);
  }

  setPage(page) {
    const maxPage = this.getTotalPages();
    if (page < 1) page = 1;
    if (page > maxPage) page = maxPage;
    this.currentPage = page;
  }

  getCurrentPageData() {
    if (!this.currentDoc || this.filteredIndices.length === 0) {
      return {
        rows: [],
        startIndex: 0,
        endIndex: 0,
        totalMatches: 0,
        page: 1,
        totalPages: 1
      };
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredIndices.length);
    const pageRows = [];

    for (let i = startIndex; i < endIndex; i++) {
      const originalRowIndex = this.filteredIndices[i];
      pageRows.push({
        index: originalRowIndex + 1,
        data: this.currentDoc.rows[originalRowIndex]
      });
    }

    return {
      rows: pageRows,
      startIndex: startIndex + 1,
      endIndex: endIndex,
      totalMatches: this.filteredIndices.length,
      page: this.currentPage,
      totalPages: this.getTotalPages()
    };
  }

  static highlightText(text, keyword) {
    if (!keyword || !text) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.toString().replace(regex, '<mark class="bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100 px-0.5 rounded">$1</mark>');
  }
}

export const searchEngine = new SearchEngine();
