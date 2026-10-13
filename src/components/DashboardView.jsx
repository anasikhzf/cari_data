import React from 'react';
import { 
  FolderPlus, 
  FilePlus, 
  RefreshCw, 
  Folder, 
  FolderOpen, 
  FileSpreadsheet, 
  Lock, 
  Key, 
  Trash2, 
  ChevronRight, 
  Home 
} from 'lucide-react';

export default function DashboardView({
  currentFolder,
  folders,
  allDocs,
  folderDocs,
  onNavigateFolder,
  onOpenFolderModal,
  onOpenDocModal,
  onSyncCloud,
  onToggleFolderPin,
  onDeleteFolder,
  onToggleDocPin,
  onDeleteDoc,
  onOpenDoc
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-[#151c2c] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <button
          onClick={() => onNavigateFolder(null)}
          className={`flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer ${
            !currentFolder ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Beranda Utama</span>
        </button>
        {currentFolder && (
          <>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
              <FolderOpen className="w-4 h-4 text-amber-500" />
              {currentFolder.name}
            </span>
          </>
        )}
      </nav>

      {/* Dashboard Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#151c2c] p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {currentFolder ? `Folder: ${currentFolder.name}` : 'Penyimpanan Dokumen & Folder'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {currentFolder
              ? `Menampilkan dokumen di dalam folder "${currentFolder.name}".`
              : 'Kelola folder, kunci file dengan PIN, dan cari data spreadsheet masif secara cepat.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenFolderModal}
            className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Tambah Folder</span>
          </button>

          <button
            onClick={onOpenDocModal}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            <span>Tambah Dokumen</span>
          </button>

          <button
            onClick={onSyncCloud}
            title="Sinkronkan Ulang Cloud Database"
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Sinkron</span>
          </button>
        </div>
      </div>

      {/* Folders & Documents Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* FOLDERS */}
        {folders.map(folder => {
          const isLocked = Boolean(folder.pinHash);
          const fileCount = allDocs.filter(d => d.folderId === folder.id).length;
          return (
            <div
              key={folder.id}
              onClick={() => onNavigateFolder(folder.id)}
              className="group relative bg-white dark:bg-[#151c2c] hover:bg-slate-50 dark:hover:bg-[#1c2438] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-amber-400/50 dark:hover:border-amber-500/50 transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                    <Folder className="w-5 h-5 fill-amber-500/20" />
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => onToggleFolderPin(e, folder)}
                      title={isLocked ? 'Ubah / Hapus PIN' : 'Kunci dengan PIN'}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Key className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => onDeleteFolder(e, folder)}
                      title="Hapus Folder"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {folder.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {fileCount} berkas
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-medium">
                <span className={isLocked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
                  {isLocked ? '🔒 Terkunci' : 'Publik'}
                </span>
                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Buka &rarr;
                </span>
              </div>
            </div>
          );
        })}

        {/* DOCUMENTS */}
        {folderDocs.map(doc => {
          const isLocked = Boolean(doc.pinHash);
          const dateStr = new Date(doc.updatedAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });

          return (
            <div
              key={doc.id}
              onClick={() => onOpenDoc(doc)}
              className="group relative bg-white dark:bg-[#151c2c] hover:bg-slate-50 dark:hover:bg-[#1c2438] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-400/50 dark:hover:border-blue-500/50 transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg text-white flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: doc.badgeColor || '#2563eb' }}
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={(e) => onToggleDocPin(e, doc)}
                      title={isLocked ? 'Ubah / Hapus PIN' : 'Kunci dengan PIN'}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      {isLocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Key className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => onDeleteDoc(e, doc)}
                      title="Hapus Dokumen"
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {doc.name}
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex flex-col gap-0.5">
                  <span>{doc.rowCount ? `${doc.rowCount.toLocaleString('id-ID')} baris` : 'Spreadsheet'}</span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{dateStr}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-medium">
                <span className={isLocked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
                  {isLocked ? '🔒 Terkunci' : 'Publik'}
                </span>
                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  Buka &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {folders.length === 0 && folderDocs.length === 0 && (
        <div className="py-16 text-center flex flex-col items-center justify-center bg-white dark:bg-[#151c2c] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            Folder ini kosong
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
            Klik "+ Tambah Dokumen" atau "+ Tambah Folder" untuk mulai menyimpan data spreadsheet Anda.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onOpenFolderModal}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Tambah Folder
            </button>
            <button
              onClick={onOpenDocModal}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Tambah Dokumen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
