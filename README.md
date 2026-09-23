# 📊 CariData

Aplikasi PWA untuk membaca, mengelompokkan, dan mencari data dari Google Sheets / CSV pada perangkat mobile maupun desktop.

---

## 🎯 Fokus Sistem & Kelebihan Utama

Aplikasi ini dirancang untuk mempermudah akses dan pencarian data spreadsheet dari Google Sheets secara terpusat, tanpa perlu membuka file spreadsheet berukuran besar secara langsung di perangkat HP.

### 📌 Kelebihan & Fitur Utama:

1. **Sinkronisasi Terpusat (Multi-Device Sync)**:
   - Menggunakan Google Sheets sebagai Master Database (*Single Source of Truth*).
   - Penambahan atau penghapusan file tersinkronisasi otomatis ke seluruh perangkat tim dalam interval 20 detik tanpa tertahan cache.

2. **Pengamanan File & Folder (PIN Lock)**:
   - Menyediakan fitur kunci PIN keamanan pada dokumen maupun folder.
   - Opsi untuk menambah, mengedit, atau menghapus PIN keamanan tersedia langsung pada setiap kartu dokumen/folder.

3. **Pencarian & Filter Kolom**:
   - Pencarian kata kunci secara instan di semua kolom atau spesifik per kolom.
   - Dilengkapi sistem paginasi dan pengurutan (*sorting*) data berdasarkan kolom.

4. **PWA (Progressive Web App) & Akses Offline**:
   - Dapat diinstal ke Layar Utama (*Home Screen*) HP Android, iOS, maupun komputer.
   - Menggunakan Service Worker (`sw.js`) untuk akses cepat dan dukungan tampilan offline.

5. **Pengelompokan Folder & Navigasi**:
   - Memungkinkan pembuatan folder untuk mengelompokkan dokumen spreadsheet.
   - Dilengkapi navigasi *breadcrumb* untuk mempermudah navigasi antar folder.

6. **Proteksi Link (Server Proxy)**:
   - Menggunakan endpoint proxy server-side (`/api/proxy`) untuk menyembunyikan URL asli Google Sheets dari inspect browser.

---

## 🛠️ Arsitektur & Teknologi

- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript (ES Modules).
- **Backend / Proxy**: Cloudflare Pages Functions (`functions/api/proxy.js`) & Node.js Express (`server.js`).
- **Offline & PWA**: Service Worker (`sw.js`), Web App Manifest (`manifest.json`).

---

## 📱 Panduan Penginstalan PWA

### Android (Google Chrome)
1. Buka aplikasi di Chrome.
2. Klik tombol **Instal** di header atau menu browser (&vellip;) &rarr; pilih **"Tambahkan ke Layar Utama"** / **"Instal Aplikasi"**.

### iPhone / iOS (Safari)
1. Buka aplikasi di Safari.
2. Tekan tombol **Bagikan (Share)** &rarr; pilih **"Tambah ke Layar Utama (Add to Home Screen)"**.

---

## 📊 Pengaturan Database Terpusat

Untuk menyinkronkan seluruh perangkat tim ke satu Master Spreadsheet, baca panduan teknis pada berkas **[sheet.md](sheet.md)**.

---

## 📄 Lisensi

MIT License.
