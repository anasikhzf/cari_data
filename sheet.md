# 📊 Panduan Pengaturan Google Sheets Sebagai Database Terpusat (CariData)

Dokumen ini berisi panduan resmi untuk menjadikan **Google Sheets** sebagai **Database Utama (*Single Source of Truth*)** untuk seluruh aplikasi PWA **CariData**.

Seluruh metadata — termasuk ID dokumen, nama file asli, link spreadsheet, warna badge, nama folder, PIN keamanan, hingga waktu upload — disimpan dan disinkronkan secara terpusat di Google Sheets.

---

## ⚡ Struktur Tabel Database Utama (Google Sheets)

Buat tabel pada **Baris 1** di tab pertama (`Daftar Dokumen`):

| A (ID Dokumen) | B (Nama Dokumen) | C (Link Spreadsheet / CSV) | D (Warna Badge) | E (Nama Folder) | F (Kunci PIN) | G (Waktu Upload) | H (Keterangan) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DOC-1001` | Data Stok Barang Gudang | `https://docs.google.com/spreadsheets/d/...` | `#2563eb` | `Gudang Utama` | | `2026-09-22 12:00` | Data Inventaris |
| `DOC-1002` | Laporan Keuangan Bulanan | `https://docs.google.com/spreadsheets/d/...` | `#10b981` | `Keuangan` | `1234` | `2026-09-22 12:05` | Laporan Keuangan |

*Catatan: Pengguna dapat mengunggah dokumen dengan link spreadsheet yang sama beberapa kali. Selama baris memiliki **ID Dokumen (Kolom A)** yang berbeda, aplikasi akan menampilkan keduanya sebagai 2 dokumen terpisah.*

---

## ⚡ Cara Kerja Sinkronisasi Terpusat

Ada **2 Cara** memasukkan dokumen agar muncul di semua perangkat:

### 1. Otomatis via Aplikasi (Oleh Pengguna di HP/Komputer)
Saat pengguna menekan tombol **"+ Tambah Link Dokumen"** di dalam aplikasi:
- Sistem akan **otomatis mengambil nama asli Google Sheet** tersebut.
- Jika Apps Script Webhook dipasang, link & metadata dokumen akan **otomatis dituliskan ke Master Google Sheet**.
- Seluruh perangkat HP/Laptop pengguna lain akan **otomatis tersinkron secara real-time**.

### 2. Manual via Master Google Sheets (Oleh Admin)
Admin dapat menambahkan baris baru secara langsung di Google Sheets Master. Jika kolom **Nama Dokumen (B)** dikosongkan, CariData akan membaca nama asli dari file Google Sheet tersebut.

---

## 🔓 Langkah 1: Membuka Akses Lihat ("Siapa saja yang memiliki link")

1. Di pojok kanan atas Google Sheets Master Anda, klik tombol **Bagikan (Share)**.
2. Pada bagian **Akses Umum (General Access)**, ubah menjadi **"Siapa saja yang memiliki link"**.
3. Salin Link Google Sheets tersebut.

---

## 🤖 Langkah 2: Kode Google Apps Script Webhook (`doPost`)

Agar tombol **"+ Tambah Link Dokumen"** dan **"Hapus Dokumen"** di aplikasi HP bisa **otomatis menulis dan menghapus baris di Google Sheets Master**:

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
      var folder = data.folder || data.note || "";
      var pin = data.pin || "";
      var time = new Date().toLocaleString("id-ID");
      var note = data.note || "Ditambahkan via Aplikasi";
      
      sheet.appendRow([docId, name, url, color, folder, pin, time, note]);
      
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
6. Tempelkan URL tersebut ke variabel `MASTER_WEBHOOK_URL` di file `data/config.js`.

---

## 🔗 Penggunaan LocalStorage
`localStorage` di perangkat browser pengguna **hanya digunakan secara eksklusif untuk menyimpan preferensi Tema Tampilan (`caridata_theme`)** (Terang / Gelap / Otomatis). Seluruh data dokumen, folder, dan tautan master murni dikelola langsung melalui Google Sheets Master.
