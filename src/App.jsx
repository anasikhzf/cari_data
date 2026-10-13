import React, { useState, useEffect } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import DocumentViewer from './components/DocumentViewer';
import {
  AddFolderModal,
  AddDocModal,
  SecurityPinModal,
  InstallGuideModal
} from './components/ModalComponents';
import { useTheme, useDigitalClock, usePWAInstall } from './hooks/useAppState';
import { db } from './services/db';
import { DocumentParser } from './services/parser';
import { searchEngine } from './services/searchEngine';
import { CONFIG } from './config';

export default function App() {
  const [theme, setTheme] = useTheme();
  const timeStr = useDigitalClock();
  const { showGuide, setShowGuide, triggerInstall } = usePWAInstall();

  // Navigation & Data State
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folders, setFolders] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [folderDocs, setFolderDocs] = useState([]);

  // Viewer State
  const [activeDoc, setActiveDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCol, setSelectedCol] = useState('-1');
  const [sortCol, setSortCol] = useState(-1);
  const [sortAsc, setSortAsc] = useState(true);
  const [tablePageData, setTablePageData] = useState({
    rows: [],
    startIndex: 0,
    endIndex: 0,
    totalMatches: 0,
    page: 1,
    totalPages: 1
  });

  // Feedback State
  const [loadingText, setLoadingText] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modals Input State
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState('');
  const [folderPinInput, setFolderPinInput] = useState('');

  const [showDocModal, setShowDocModal] = useState(false);
  const [docUrlInput, setDocUrlInput] = useState('');
  const [docPinInput, setDocPinInput] = useState('');
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinTargetTitle, setPinTargetTitle] = useState('');
  const [pinTargetHash, setPinTargetHash] = useState('');
  const [pinInputValue, setPinInputValue] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinSuccessCallback, setPinSuccessCallback] = useState(null);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (msg) => setToastMessage(msg);

  // Initial Sync from Centralized Google Sheet
  useEffect(() => {
    async function initData() {
      setLoadingText('Menyinkronkan data dari Google Sheets...');
      try {
        await db.init();
        if (CONFIG.MASTER_SHEET_URL) {
          await syncMasterSheet(CONFIG.MASTER_SHEET_URL, true);
        }
        await refreshDashboard();
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoadingText('');
      }
    }
    initData();
  }, []);

  // Background Auto-sync
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      if (CONFIG.MASTER_SHEET_URL && navigator.onLine && !activeDoc) {
        await syncMasterSheet(CONFIG.MASTER_SHEET_URL, true);
      }
    }, CONFIG.AUTO_SYNC_INTERVAL_MS || 20000);

    return () => clearInterval(syncInterval);
  }, [activeDoc]);

  // Refresh Folders & Docs in View
  const refreshDashboard = async () => {
    const allF = await db.getAllFolders();
    const allD = await db.getAllDocuments(null);
    setFolders(allF.filter(f => (!currentFolderId && !f.parentId) || f.parentId === currentFolderId));
    setAllDocs(allD);
    const currDocs = await db.getAllDocuments(currentFolderId || 'ROOT');
    setFolderDocs(currDocs);
  };

  // Sync Data Logic
  const syncMasterSheet = async (url, silent = false) => {
    if (!url) return;
    if (!silent) setLoadingText('Menyinkronkan data...');
    try {
      const docs = await DocumentParser.parseMasterIndexSheet(url);
      const existing = await db.getAllDocuments();
      const pinMap = new Map();
      existing.forEach(d => { if (d.pinHash) pinMap.set(d.id, d.pinHash); });

      await db.clearAllDocuments();
      if (docs && docs.length > 0) {
        for (const doc of docs) {
          if (!doc.pinHash && pinMap.has(doc.id)) {
            doc.pinHash = pinMap.get(doc.id);
          }
          await db.saveDocument(doc);
        }
      }
      await refreshDashboard();
      if (!silent) showToast('✅ Data berhasil disinkronkan!');
    } catch (err) {
      console.warn('Sync error:', err);
      if (!silent) alert('Gagal sinkron: ' + err.message);
    } finally {
      if (!silent) setLoadingText('');
    }
  };

  // Folder Navigation
  const navigateToFolder = async (folderId) => {
    if (folderId) {
      const folder = await db.getFolderById(folderId);
      if (folder && folder.pinHash) {
        promptPin(folder.name, folder.pinHash, async () => {
          setCurrentFolderId(folderId);
          setCurrentFolder(folder);
        });
        return;
      }
      setCurrentFolderId(folderId);
      setCurrentFolder(folder);
    } else {
      setCurrentFolderId(null);
      setCurrentFolder(null);
    }
  };

  useEffect(() => {
    refreshDashboard();
  }, [currentFolderId]);

  // PIN Authentication
  const promptPin = (targetName, correctHash, onSuccess) => {
    setPinTargetTitle(targetName);
    setPinTargetHash(correctHash);
    setPinInputValue('');
    setPinError(false);
    setPinSuccessCallback(() => onSuccess);
    setShowPinModal(true);
  };

  const verifyPin = (e) => {
    e.preventDefault();
    if (String(pinInputValue).trim() === String(pinTargetHash).trim()) {
      setShowPinModal(false);
      if (pinSuccessCallback) pinSuccessCallback();
    } else {
      setPinError(true);
      setPinInputValue('');
    }
  };

  // Folder Operations
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;

    const folderId = await db.getOrCreateFolderByName(folderNameInput.trim(), folderPinInput.trim() || null);

    if (CONFIG.MASTER_WEBHOOK_URL) {
      fetch(CONFIG.MASTER_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_folder',
          id: folderId,
          folder: folderNameInput.trim(),
          name: folderNameInput.trim(),
          pin: folderPinInput.trim() || '',
          note: 'Folder Penyimpanan'
        })
      }).catch(() => {});
    }

    setShowFolderModal(false);
    setFolderNameInput('');
    setFolderPinInput('');
    await refreshDashboard();
    showToast(`📁 Folder "${folderNameInput.trim()}" berhasil dibuat!`);
  };

  const handleDeleteFolder = async (e, folder) => {
    e.stopPropagation();
    const action = async () => {
      if (confirm(`Hapus folder "${folder.name}"? Berkas di dalamnya akan dipindahkan ke Beranda.`)) {
        await db.deleteFolder(folder.id);
        await refreshDashboard();
        showToast(`Folder "${folder.name}" dihapus.`);
      }
    };
    if (folder.pinHash) promptPin(folder.name, folder.pinHash, action);
    else action();
  };

  const handleToggleFolderPin = async (e, folder) => {
    e.stopPropagation();
    const action = async () => {
      const newPin = prompt(`Masukkan PIN baru untuk "${folder.name}" (Kosongkan untuk hapus PIN):`, folder.pinHash || '');
      if (newPin !== null) {
        folder.pinHash = newPin.trim() || null;
        await db.saveFolder(folder);
        await refreshDashboard();
        showToast(folder.pinHash ? `🔒 Folder dikunci dengan PIN` : `🔓 Kunci PIN folder dihapus`);
      }
    };
    if (folder.pinHash) promptPin(folder.name, folder.pinHash, action);
    else action();
  };

  // Document Operations
  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!docUrlInput.trim()) return;

    try {
      setIsSubmittingDoc(true);
      setLoadingText('Mengunduh & memproses spreadsheet baru...');

      const docData = await DocumentParser.parseFromUrl(docUrlInput.trim());
      docData.folderId = currentFolderId;
      docData.pinHash = docPinInput.trim() || null;

      await db.saveDocument(docData);

      if (CONFIG.MASTER_WEBHOOK_URL) {
        fetch(CONFIG.MASTER_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: docData.id,
            name: docData.name,
            url: docUrlInput.trim(),
            color: docData.badgeColor,
            folder: currentFolder ? currentFolder.name : '',
            note: currentFolder ? currentFolder.name : '',
            pin: docData.pinHash || ''
          })
        }).catch(() => {});
      }

      setShowDocModal(false);
      setDocUrlInput('');
      setDocPinInput('');
      await refreshDashboard();
      openDocument(docData);
    } catch (err) {
      alert(`Gagal memproses dokumen:\n${err.message}`);
    } finally {
      setIsSubmittingDoc(false);
      setLoadingText('');
    }
  };

  const handleDeleteDoc = async (e, doc) => {
    e.stopPropagation();
    const action = async () => {
      if (confirm(`Hapus dokumen "${doc.name}"?`)) {
        await db.deleteDocument(doc.id);
        await refreshDashboard();
        showToast(`Dokumen "${doc.name}" telah dihapus.`);
      }
    };
    if (doc.pinHash) promptPin(doc.name, doc.pinHash, action);
    else action();
  };

  const handleToggleDocPin = async (e, doc) => {
    e.stopPropagation();
    const action = async () => {
      const newPin = prompt(`Masukkan PIN baru untuk "${doc.name}" (Kosongkan untuk hapus PIN):`, doc.pinHash || '');
      if (newPin !== null) {
        doc.pinHash = newPin.trim() || null;
        await db.saveDocument(doc);
        await refreshDashboard();
        showToast(doc.pinHash ? `🔒 Dokumen dikunci dengan PIN` : `🔓 Kunci PIN dokumen dihapus`);
      }
    };
    if (doc.pinHash) promptPin(doc.name, doc.pinHash, action);
    else action();
  };

  // Document Viewer Handlers
  const openDocument = (doc) => {
    const launch = () => {
      setActiveDoc(doc);
      setSearchQuery('');
      setSelectedCol('-1');
      setSortCol(-1);
      setSortAsc(true);
      searchEngine.setDocument(doc);
      setTablePageData(searchEngine.getCurrentPageData());

      if (doc.sourceUrl && doc.sourceUrl.startsWith('http')) {
        DocumentParser.parseFromUrl(doc.sourceUrl, doc.name, doc.id)
          .then(async (fresh) => {
            fresh.folderId = doc.folderId;
            fresh.pinHash = doc.pinHash;
            if (fresh.rowCount !== doc.rowCount || fresh.updatedAt !== doc.updatedAt) {
              await db.saveDocument(fresh);
              setActiveDoc(fresh);
              searchEngine.setDocument(fresh);
              setTablePageData(searchEngine.getCurrentPageData());
            }
          })
          .catch(() => {});
      }
    };

    if (doc.pinHash) promptPin(doc.name, doc.pinHash, launch);
    else launch();
  };

  const handleSearchChange = (query, col = selectedCol) => {
    setSearchQuery(query);
    searchEngine.search(query, col);
    setTablePageData(searchEngine.getCurrentPageData());
  };

  const handleColumnFilterChange = (col) => {
    setSelectedCol(col);
    searchEngine.search(searchQuery, col);
    setTablePageData(searchEngine.getCurrentPageData());
  };

  const handleSort = (colIdx) => {
    searchEngine.sortByColumn(colIdx);
    setSortCol(searchEngine.sortColumn);
    setSortAsc(searchEngine.sortAscending);
    setTablePageData(searchEngine.getCurrentPageData());
  };

  const handlePageChange = (newPage) => {
    searchEngine.setPage(newPage);
    setTablePageData(searchEngine.getCurrentPageData());
  };

  const refreshActiveDocument = async () => {
    if (!activeDoc || !activeDoc.sourceUrl) {
      alert('Dokumen ini tidak terhubung ke spreadsheet publik.');
      return;
    }
    setLoadingText('Memperbarui data live dari Google Sheets...');
    try {
      const fresh = await DocumentParser.parseFromUrl(activeDoc.sourceUrl, activeDoc.name, activeDoc.id);
      fresh.folderId = activeDoc.folderId;
      fresh.pinHash = activeDoc.pinHash;
      await db.saveDocument(fresh);
      setActiveDoc(fresh);
      searchEngine.setDocument(fresh);
      handleSearchChange(searchQuery, selectedCol);
      showToast(`✅ Data diperbarui! (${fresh.rowCount} baris)`);
    } catch (err) {
      alert(`Gagal memperbarui: ${err.message}`);
    } finally {
      setLoadingText('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 dark:bg-[#0b0f19] dark:text-slate-100 font-sans transition-colors duration-200">
      <Header
        theme={theme}
        setTheme={setTheme}
        timeStr={timeStr}
        onResetView={() => setActiveDoc(null)}
        onInstallClick={() => triggerInstall(() => showToast('Aplikasi berhasil dipasang!'))}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {!activeDoc ? (
          <DashboardView
            currentFolder={currentFolder}
            folders={folders}
            allDocs={allDocs}
            folderDocs={folderDocs}
            onNavigateFolder={navigateToFolder}
            onOpenFolderModal={() => setShowFolderModal(true)}
            onOpenDocModal={() => setShowDocModal(true)}
            onSyncCloud={() => syncMasterSheet(CONFIG.MASTER_SHEET_URL)}
            onToggleFolderPin={handleToggleFolderPin}
            onDeleteFolder={handleDeleteFolder}
            onToggleDocPin={handleToggleDocPin}
            onDeleteDoc={handleDeleteDoc}
            onOpenDoc={openDocument}
          />
        ) : (
          <DocumentViewer
            activeDoc={activeDoc}
            searchQuery={searchQuery}
            selectedCol={selectedCol}
            sortCol={sortCol}
            sortAsc={sortAsc}
            tablePageData={tablePageData}
            onBack={() => setActiveDoc(null)}
            onRefresh={refreshActiveDocument}
            onSearchChange={handleSearchChange}
            onColChange={handleColumnFilterChange}
            onSort={handleSort}
            onPageChange={handlePageChange}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-[#151c2c]/50 py-3 text-center text-xs text-slate-400 dark:text-slate-500">
        &copy; 2026 CariData. Created by{' '}
        <a href="https://anasikhzf.web.app" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
          anasikhzf
        </a>
      </footer>

      <AddFolderModal
        show={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        onSubmit={handleCreateFolder}
        folderName={folderNameInput}
        setFolderName={setFolderNameInput}
        folderPin={folderPinInput}
        setFolderPin={setFolderPinInput}
      />

      <AddDocModal
        show={showDocModal}
        onClose={() => setShowDocModal(false)}
        onSubmit={handleCreateDocument}
        docUrl={docUrlInput}
        setDocUrl={setDocUrlInput}
        docPin={docPinInput}
        setDocPin={setDocPinInput}
        isSubmitting={isSubmittingDoc}
      />

      <SecurityPinModal
        show={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSubmit={verifyPin}
        targetTitle={pinTargetTitle}
        pinInput={pinInputValue}
        setPinInput={setPinInputValue}
        isError={pinError}
      />

      <InstallGuideModal
        show={showGuide}
        onClose={() => setShowGuide(false)}
      />

      {loadingText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#151c2c] px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {loadingText}
            </span>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 px-4 py-2.5 rounded-full shadow-lg text-xs sm:text-sm font-medium backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
