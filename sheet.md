# 📊 Panduan Pengaturan Google Sheets Sebagai Database Terpusat (CariData)

Dokumen ini berisi panduan untuk menjadikan **Google Sheets** sebagai **Database Cloud Terpusat**. 

Dengan fitur ini, data spreadsheet dapat **otomatis tersinkronisasi di seluruh HP, Tablet, dan Komputer** yang membuka web PWA **CariData**.

---

## ⚡ Cara Kerja Sinkronisasi Terpusat

Ada **2 Cara** memasukkan dokumen agar muncul di semua perangkat:

### 1. Otomatis via Aplikasi (Oleh Pengguna di HP/Komputer) — *Sangat Direkomendasikan*
Saat siapa pun menekan tombol **"+ Tambah Link Dokumen"** di dalam aplikasi CariData:
- Sistem akan **otomatis mengambil nama asli Google Sheet** tersebut.
- Jika Google Apps Script Webhook dipasang, link & nama dokumen akan **otomatis dituliskan ke Master Google Sheet**.
- Seluruh perangkat HP/Laptop pengguna lain akan **otomatis tersinkron secara real-time** tanpa perlu menekan tombol sinkronisasi.

### 2. Manual via Master Google Sheets (Oleh Admin)
Admin dapat menambahkan baris link spreadsheet baru langsung pada tab `Daftar Dokumen` di Google Sheets Master:

| A (ID Dokumen) | B (Nama Dokumen) | C (Link Spreadsheet / CSV) | D (Warna Badge) | E (Keterangan) |
| :--- | :--- | :--- | :--- | :--- |
| `DOC-001` | Data Stok barang Gudang | `https://docs.google.com/spreadsheets/d/...` | `#2563eb` | Data inventaris |

*Catatan: Jika kolom **Nama Dokumen (B)** dikosongkan oleh Admin, CariData akan secara otomatis membaca dan menampilkan nama asli dari file Google Sheet tersebut.*

---

## 🚀 Langkah 1: Buat Master Spreadsheet di Google Drive

1. Buka [Google Sheets](https://sheets.google.com) dan buat **Spreadsheet Baru**.
2. Beri nama file Google Sheets Anda: `CariData Master Database`.
3. Buat header pada **Baris 1** di tab pertama (`Daftar Dokumen`):

| A (ID Dokumen) | B (Nama Dokumen) | C (Link Spreadsheet / CSV) | D (Warna Badge) | E (Keterangan) |
| :--- | :--- | :--- | :--- | :--- |

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
    var action = data.action || "add";

    // 1. OTOMATIS HAPUS DOKUMEN DARI GOOGLE SHEET
    if (action === "delete") {
      var rows = sheet.getDataRange().getValues();
      var targetId = (data.id || "").toString().toLowerCase();
      var targetUrl = (data.url || "").toString().toLowerCase();

      for (var i = rows.length - 1; i >= 1; i--) {
        var rowId = (rows[i][0] || "").toString().toLowerCase();
        var rowUrl = (rows[i][2] || "").toString().toLowerCase();

        if ((targetId && rowId === targetId) || (targetUrl && rowUrl === targetUrl)) {
          sheet.deleteRow(i + 1); // Hapus baris di Google Sheets
          return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "delete" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "not_found" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    // 2. OTOMATIS TAMBAH DOKUMEN KE GOOGLE SHEET
    else {
      var docId = data.id || ("DOC-" + Math.floor(Math.random() * 8999 + 1000));
      var name = data.name || "";
      var url = data.url || "";
      var color = data.color || "#2563eb";
      var note = data.note || "Ditambahkan via Aplikasi HP";
      
      sheet.appendRow([docId, name, url, color, note]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "add", id: docId }))
        .setMimeType(ContentService.MimeType.JSON);
    }
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
