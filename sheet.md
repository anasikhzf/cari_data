# 📊 Panduan Pengaturan Google Sheets Sebagai Database Terpusat (CariData)

Dokumen ini berisi panduan untuk menjadikan **Google Sheets** sebagai **Database Cloud Terpusat**. 

Dengan fitur ini, data spreadsheet dapat **otomatis tersinkronisasi di seluruh HP, Tablet, dan Komputer** yang membuka web PWA **CariData**.

---

## ⚡ Cara Kerja Sinkronisasi Terpusat

Ada **2 Cara** memasukkan dokumen agar muncul di semua perangkat:

### 1. Manual via Google Sheets (Oleh Admin)
Admin menambahkan baris link spreadsheet baru langsung pada tab `Daftar Dokumen` di Google Sheets Master.

### 2. Otomatis via Aplikasi (Oleh Pengguna di HP)
Saat siapa pun menekan tombol **"+ Tambah Link Dokumen"** di dalam aplikasi CariData, sistem akan **otomatis mengirim & menambahkan baris baru ke Master Google Sheet** (menggunakan Google Apps Script Webhook).

---

## 🚀 Langkah 1: Buat Master Spreadsheet di Google Drive

1. Buka [Google Sheets](https://sheets.google.com) dan buat **Spreadsheet Baru**.
2. Beri nama file Google Sheets Anda: `CariData Master Database`.
3. Buat header pada **Baris 1** di tab pertama (`Daftar Dokumen`):

| A (ID Dokumen) | B (Nama Dokumen) | C (Link Spreadsheet / CSV) | D (Warna Badge) | E (Keterangan) |
| :--- | :--- | :--- | :--- | :--- |
| `DOC-001` | Data Stok barang Gudang | `https://docs.google.com/spreadsheets/d/...` | `#2563eb` | Data inventaris |

---

## 🔓 Langkah 2: Membuka Akses Lihat ("Siapa saja yang memiliki link")

1. Di pojok kanan atas Google Sheets, klik tombol **Bagikan (Share)**.
2. Pada bagian **Akses Umum (General Access)**, ubah dari *Dibatasi (Restricted)* menjadi **"Siapa saja yang memiliki link"**.
3. Klik **Salin Link (Copy Link)**.

---

## 🤖 Langkah 3 (Opsional): Aktifkan Otomatis Tambah via Aplikasi (Google Apps Script)

Agar tombol **"+ Tambah Link Dokumen"** di aplikasi HP bisa **otomatis menulis ke Google Sheets Master**:

1. Di Google Sheets Master Anda, klik menu **Ekstensi (Extensions)** &rarr; **Apps Script**.
2. Hapus semua kode yang ada, lalu tempelkan (*paste*) kode berikut:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Daftar Dokumen") || ss.getSheets()[0];
    
    var docId = data.id || ("DOC-" + Math.floor(Math.random() * 8999 + 1000));
    var name = data.name || "Dokumen Baru";
    var url = data.url || "";
    var color = data.color || "#2563eb";
    var note = data.note || "Ditambahkan via Aplikasi HP";
    
    sheet.appendRow([docId, name, url, color, note]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", id: docId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("CariData Webhook API Active");
}
```

3. Klik tombol **Terapkan (Deploy)** &rarr; **Terapkan Sebagai Aplikasi Web (New Deployment)**.
4. Pada **Siapa yang memiliki akses (Who has access)**, pilih **"Siapa Saja (Anyone)"**.
5. Klik **Terapkan (Deploy)** dan salin **URL Aplikasi Web** yang dihasilkan.
6. Tempelkan URL tersebut ke variabel `MASTER_WEBHOOK_URL` di file `data/config.js` web ini.

---

## 🔗 Langkah 4: Hubungkan Master Spreadsheet ke Kode Web (`data/config.js`)

Buka file `data/config.js` di repositori web ini:

```javascript
export const CONFIG = {
  // Link Google Sheets Master untuk membaca daftar dokumen:
  MASTER_SHEET_URL: "https://docs.google.com/spreadsheets/d/1w8V3UZ7U7ng14hOM4mOy48qgwbIU3XYHda3jVgtHE_o/edit?usp=sharing",
  
  // Link Webhook Apps Script untuk otomatis menulis saat Tambah Dokumen di HP (Opsional):
  MASTER_WEBHOOK_URL: ""
};
```
