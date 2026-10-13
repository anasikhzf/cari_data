import React from 'react';
import { ArrowLeft, RefreshCw, Search, X } from 'lucide-react';
import { SearchEngine } from '../services/searchEngine';

export default function DocumentViewer({
  activeDoc,
  searchQuery,
  selectedCol,
  sortCol,
  sortAsc,
  tablePageData,
  onBack,
  onRefresh,
  onSearchChange,
  onColChange,
  onSort,
  onPageChange
}) {
  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-[#151c2c] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <button
              onClick={onRefresh}
              title="Segarkan Data Langsung Dari Spreadsheet"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-blue-500" />
            </button>
          </div>

          <div className="flex-1 min-w-[200px] text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-md">
                {activeDoc.name}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
                Read-Only
              </span>
            </div>
          </div>

          <div className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {searchQuery ? `${tablePageData.totalMatches.toLocaleString('id-ID')} / ` : 'Total: '}
            {activeDoc.rowCount?.toLocaleString('id-ID')} baris
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari kata kunci di semua kolom..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={selectedCol}
            onChange={(e) => onColChange(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="-1">Semua Kolom</option>
            {activeDoc.headers?.map((h, i) => (
              <option key={i} value={i}>Kolom: {h}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Virtualized Table Container */}
      <div className="flex-1 bg-white dark:bg-[#151c2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[62vh] relative">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 uppercase font-semibold text-[11px] tracking-wider select-none backdrop-blur-xs">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center text-slate-400 font-mono">#</th>
                {activeDoc.headers?.map((header, colIdx) => (
                  <th
                    key={colIdx}
                    onClick={() => onSort(colIdx)}
                    className="py-2.5 px-4 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{header}</span>
                      <span className="text-[10px] text-blue-500">
                        {sortCol === colIdx ? (sortAsc ? '▲' : '▼') : ''}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tablePageData.rows.length > 0 ? (
                tablePageData.rows.map((rowItem) => (
                  <tr
                    key={rowItem.index}
                    className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <td className="py-2 px-3 text-center text-slate-400 dark:text-slate-500 font-mono text-xs">
                      {rowItem.index}
                    </td>
                    {rowItem.data.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="py-2 px-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-normal"
                        dangerouslySetInnerHTML={{
                          __html: SearchEngine.highlightText(cell || '', searchQuery)
                        }}
                      />
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={(activeDoc.headers?.length || 0) + 1}
                    className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs sm:text-sm"
                  >
                    🔍 Tidak ada data yang cocok dengan pencarian "{searchQuery}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Halaman {tablePageData.page} dari {tablePageData.totalPages} ({tablePageData.startIndex}-{tablePageData.endIndex} dari {tablePageData.totalMatches.toLocaleString('id-ID')} baris)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={tablePageData.page <= 1}
              onClick={() => onPageChange(tablePageData.page - 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-all cursor-pointer"
            >
              &larr; Prev
            </button>
            <button
              disabled={tablePageData.page >= tablePageData.totalPages}
              onClick={() => onPageChange(tablePageData.page + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-all cursor-pointer"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
