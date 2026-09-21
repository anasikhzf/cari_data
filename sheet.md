# 📊 Panduan Pengaturan Google Sheets Sebagai Database Terpusat (CariData)

Dokumen ini berisi panduan langkah-demi-langkah untuk menjadikan **Google Sheets** sebagai **Database Cloud Terpusat**. Dengan metode ini, semua dokumen dan data yang dimasukkan ke Google Sheets akan **otomatis tersinkronisasi di seluruh HP, Tablet, dan Komputer** yang membuka web PWA **CariData**.

---

## 🚀 Langkah 1: Buat Master Spreadsheet di Google Drive

1. Buka [Google Sheets](https://sheets.google.com) dan buat **Spreadsheet Baru**.
2. Beri nama file Google Sheets Anda, misalnya: `CariData Master Database`.

---

## 📋 Langkah 2: Buat Lembar Kerja (Tab) Index "Daftar Dokumen"

Pada Tab pertama (beri nama tab: `Daftar Dokumen`), buat struktur kolom pada **Baris 1** seperti berikut:

| A (ID Dokumen) | B (Nama Dokumen) | C (Link Spreadsheet / CSV) | D (Warna Badge) | E (Keterangan) |
| :--- | :--- | :--- | :--- | :--- |
| `DOC-001` | Data Stok barang Gudang | `https://docs.google.com/spreadsheets/d/...` | `#2563eb` | Data inventaris fisik |
| `DOC-002` | Daftar Harga Layanan | `https://docs.google.com/spreadsheets/d/...` | `#059669` | Pricelist terbaru 2026 |

> **Catatan Struktur Kolom**:
> - **Baris 1** wajib berisi nama header (`ID Dokumen`, `Nama Dokumen`, `Link Spreadsheet`, dst).
> - **Baris 2 dst** berisi daftar spreadsheet yang ingin ditampilkan di aplikasi CariData semua HP.

---

## 📄 Langkah 3: Menyiapkan Isi Dokumen Data (Spreadsheet Data)

Untuk setiap spreadsheet data (misalnya Google Sheets "Data Stok barang Gudang"):
1. Pastikan **Baris 1** adalah **Header Kolom** (misal: `Kode`, `Nama Barang`, `Kategori`, `Stok`, `Harga`).
2. **Baris 2 ke bawah** adalah data baris yang ingin dicari oleh pengguna.

---

## 🔓 Langkah 4: Membuka Akses Publik ("Siapa saja yang memiliki link")

Agar aplikasi CariData di semua HP dapat membaca data tanpa perlu login akun Google:

1. Di pojok kanan atas Google Sheets, klik tombol **Bagikan (Share)**.
2. Pada bagian **Akses Umum (General Access)**, ubah dari *Dibatasi (Restricted)* menjadi **"Siapa saja yang memiliki link" (Anyone with the link)**.
3. Pastikan perannya disetel sebagai **Pengakses Lihat Saja (Viewer)**.
4. Klik **Salin Link (Copy Link)**.

---

## 🔗 Langkah 5: Hubungkan Link Master Spreadsheet ke Aplikasi

Ada 2 Cara Menghubungkan Link ke Aplikasi:

### **Cara A (Pengaturan di Aplikasi CariData)**:
1. Buka aplikasi **CariData** di HP / Laptop.
2. Klik tombol **"⚙️ Set Database Cloud"** di bagian atas.
3. Tempelkan (*paste*) link Master Google Sheet yang telah disalin.
4. Klik **Simpan & Sinkronkan**. Seluruh data dokumen akan langsung tampil di semua HP!

### **Cara B (Kustomisasi Bawaan Kode Web `data/config.js`)**:
Buka file `data/config.js` di repositori web ini, lalu isi variabel `MASTER_SHEET_URL` dengan link Google Sheet Anda:

```javascript
export const CONFIG = {
  // Masukkan link Google Sheets Master Anda di sini:
  MASTER_SHEET_URL: "https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit?usp=sharing"
};
```

---

## ⚡ Cara Kerja Sinkronisasi Terpusat
- **Menambah Dokumen**: Cukup tambahkan baris baru di Tab `Daftar Dokumen` pada Google Sheets Master Anda.
- **Mengedit Data Baris**: Edit data langsung di Google Sheets. Aplikasi di HP penginstal akan otomatis menampilkan data terbaru saat dibuka atau menekan tombol **Segarkan (Refresh)**.
- **Menghapus Dokumen**: Hapus baris dokumen dari Google Sheets Master.
