<div align="center">

# 📊 CariData — Viewer & Pencarian Spreadsheet Masif

<p align="center">
  <b>Aplikasi PWA Super Cepat, Ringan & Aman untuk Melihat, Mengelompokkan, dan Mencari Data Spreadsheet Tanpa Batas</b>
</p>

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-blue.svg)](https://cari-data.pages.dev)
[![Offline First](https://img.shields.io/badge/Storage-IndexedDB-emerald.svg)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
[![Sync](https://img.shields.io/badge/Cloud%20Sync-Google%20Sheets-green.svg)](sheet.md)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](#)

<br/>

[🚀 Coba Demo Live (Cloudflare Pages)](https://cari-data.pages.dev) • [📖 Panduan Database Google Sheets](sheet.md)

</div>

---

## 🌟 Keunggulan Utama & Fokus Aplikasi

**CariData** dirancang khusus untuk memecahkan masalah lambatnya membuka dan mencari data pada file Excel atau Google Sheets berukuran masif di perangkat HP / Mobile. Aplikasi ini mengubah dokumen spreadsheet statis maupun publik menjadi **aplikasi PWA lokal yang instant, responsif, dan bisa diakses secara offline**.

### 🎯 Fokus Utama Aplikasi:
1. **Performa Pencarian Masif Tanpa Lag**: Mampu memuat puluhan ribu baris data langsung ke *IndexedDB* lokal browser, memungkinkan pencarian instan dalam hitungan milidetik (*sub-millisecond search*).
2. **Desain Mobile-First & Pengalaman PWA**: Tampilan teroptimasi untuk HP Android dan iPhone tanpa ada teks atau tombol yang terpotong. Dapat diinstal langsung ke Layar Utama (*Home Screen*) layaknya aplikasi native Play Store.
3. **Penyimpanan Berstruktur Folder**: Pengelompokan file ke dalam folder (*Gudang*, *Keuangan*, *SDM*) dengan navigasi *breadcrumb* yang intuitif.
4. **Keamanan Ekstra (PIN Security Lock)**: Mengunci folder atau file sensitif dengan Kunci PIN keamanan saat dibuat, mencegah akses atau penghapusan tanpa otorisasi.
5. **Proteksi Backend Server-Side (URL Masking)**: Menggunakan Cloudflare Pages Functions (`/api/proxy`) untuk menyembunyikan link Google Sheets asli sehingga tidak dapat diintip melalui DevTools/Network Tab.
6. **Pembersihan Otomatis 1 Bulan (Auto-Cleanup)**: Menjaga ruang penyimpanan HP tetap efisien dengan menghapus dokumen atau folder yang tidak pernah dibuka selama 30 hari secara otomatis.
7. **Database Cloud Terpusat (Google Sheets Sync)**: Mendukung penggabungan satu *Master Google Sheet* agar seluruh perangkat (HP tim, laptop, tablet) memiliki daftar dokumen & data yang 100% sama secara realtime.

---

## ✨ Fitur-Fitur Unggulan

| Fitur | Deskripsi |
| :--- | :--- |
| ⭕ **Icon Bulat Ikonik** | Desain logo lingkaran presisi dengan huruf "C" glowing bergaya modern tech. |
| 🛡️ **Keamanan Server-Side (URL Masking)** | Proxy server aman (`/api/proxy`) menyembunyikan alamat link Google Sheet dari inspect browser. |
| 📁 **Manajemen Folder** | Kelola dan kelompokkan file dokumen ke dalam folder-folder teratur. |
| 🔐 **Kunci PIN File & Folder** | Proteksi folder atau file penting menggunakan PIN kunci pribadi. |
| 🧹 **Auto-Cleanup Inaktivitas 30 Hari** | Sistem otomatis menghapus file/folder tidak aktif dalam 1 bulan untuk hemat memori. |
| ⏰ **Jam Digital Realtime** | Indikator waktu digital realtime (Jam, Menit, Detik) di navbar header. |
| ☁️ **Sync Master Google Sheets** | Hubungkan 1 link Master Spreadsheet untuk sinkronisasi otomatis seluruh HP tim. |
| 📱 **Responsif Anti-Terpotong** | Tampilan presisi 2-kolom kartu di HP tanpa overflow horizontal. |
| 🌙 **Mode Gelap / Terang / Auto** | Tema dinamis otomatis menyesuaikan preferensi sistem HP/Komputer. |

---

## 🏗️ Arsitektur & Teknologi

CariData dibangun menggunakan arsitektur **Zero-Dependency Vanilla JavaScript** untuk menjamin kecepatan *load time* tertinggi dan ukuran aplikasi super kecil (< 1MB).

- **Frontend**: HTML5 Semantic, Modern Vanilla CSS3 (Custom Variables, Flexbox, CSS Grid).
- **Logic & Storage**: JavaScript ES6 Modules, IndexedDB (`CariDataDB` v2 API).
- **PWA Service Worker**: Custom Cache & Offline Fallback Strategy (`sw.js` Cache First + Network Revalidate).
- **Data Parser**: RFC 4180 Standard Stream CSV/TSV Parser & Google Viz API Integration.

---

## 📱 Panduan Penginstalan PWA di HP

### Android (Google Chrome):
1. Buka [https://cari-data.pages.dev](https://cari-data.pages.dev) di Chrome.
2. Klik tombol **"Instal App"** di navbar header atau menu 3 titik (&vellip;) browser.
3. Pilih **"Tambahkan ke Layar Utama"** / **"Instal Aplikasi"**.

### iPhone / iOS (Safari):
1. Buka [https://cari-data.pages.dev](https://cari-data.pages.dev) di Safari.
2. Tekan ikon **Bagikan (Share)** di bagian bawah layar.
3. Pilih **"Tambah ke Layar Utama (Add to Home Screen)"**.

---

## 📊 Pengaturan Database Terpusat (Multi-Device Sync)

Ingin semua HP tim Anda memiliki data spreadsheet yang **SAMA PERSIS**?
Silakan baca panduan langkah-demi-langkah pada berkas **[sheet.md](sheet.md)**.

1. Buat Google Sheet Master yang berisi daftar link spreadsheet tim.
2. Buka aplikasi **CariData** &rarr; Klik **"Cloud DB"** &rarr; Tempelkan link Master Sheet.
3. Semua HP yang terhubung akan otomatis mendapatkan update data terbaru secara realtime!

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE).
