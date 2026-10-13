import React from 'react';
import { FolderPlus, FilePlus, Lock, Download, X } from 'lucide-react';

export function AddFolderModal({
  show,
  onClose,
  onSubmit,
  folderName,
  setFolderName,
  folderPin,
  setFolderPin
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#151c2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-500" />
            Buat Folder Baru
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nama Folder
            </label>
            <input
              type="text"
              required
              placeholder="Misal: Gudang Utama, Keuangan, SDM"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              Kunci PIN Folder (Opsional)
            </label>
            <input
              type="password"
              placeholder="Kosongkan jika tanpa kunci (misal: 1234)"
              value={folderPin}
              onChange={(e) => setFolderPin(e.target.value)}
              maxLength={20}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Jika diisi, membuka atau mengelola folder ini wajib memasukkan PIN.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Buat Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddDocModal({
  show,
  onClose,
  onSubmit,
  docUrl,
  setDocUrl,
  docPin,
  setDocPin,
  isSubmitting
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#151c2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-blue-500" />
            Tambah Link Dokumen
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Link Spreadsheet (Google Sheets / CSV / TSV)
            </label>
            <input
              type="url"
              required
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Pastikan akses file di-set "Siapa saja yang memiliki link dapat melihat".
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              Kunci PIN Keamanan (Opsional)
            </label>
            <input
              type="password"
              placeholder="Kosongkan jika tanpa kunci (misal: 1234)"
              value={docPin}
              onChange={(e) => setDocPin(e.target.value)}
              maxLength={20}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Mengunduh...' : 'Simpan Dokumen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SecurityPinModal({
  show,
  onClose,
  onSubmit,
  targetTitle,
  pinInput,
  setPinInput,
  isError
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-[#151c2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 sm:p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white text-base">
          Masukkan Kunci PIN
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 truncate px-2">
          "{targetTitle}" dilindungi PIN Keamanan.
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            required
            autoFocus
            placeholder="Masukkan PIN..."
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className="w-full text-center tracking-widest text-lg py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-hidden"
          />
          {isError && (
            <p className="text-xs font-semibold text-red-500">
              PIN Salah! Silakan coba lagi.
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Buka Kunci
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function InstallGuideModal({ show, onClose }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-[#151c2c] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 sm:p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            Instal Aplikasi CariData
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>Aplikasi ini dapat diinstal langsung ke Layar Utama HP / Komputer Anda tanpa melalui Play Store:</p>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <strong className="block text-slate-900 dark:text-white mb-1">📱 Android (Google Chrome):</strong>
            Klik menu <strong>3 titik (&vellip;)</strong> di pojok kanan atas browser &rarr; pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Instal Aplikasi"</strong>.
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <strong className="block text-slate-900 dark:text-white mb-1">🍎 iPhone / iOS (Safari):</strong>
            Klik tombol <strong>Bagikan (Share)</strong> di bagian bawah &rarr; pilih <strong>"Tambah ke Layar Utama"</strong>.
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
