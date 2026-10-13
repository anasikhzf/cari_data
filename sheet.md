# 📊 Panduan Resmi Google Sheets Sebagai Database Terpusat (CariData)

Dokumen ini berisi panduan lengkap untuk menjadikan **Google Spreadsheet** sebagai **Satu-Satunya Database Utama (*Single Source of Truth*)** untuk seluruh aplikasi PWA **CariData**.

> 💡 **Prinsip Utama Sistem:**
> 1. **Tanpa LocalStorage:** Semua dokumen, folder, dan kunci PIN keamanan disimpan serta disinkronkan murni melalui baris Google Sheets.
> 2. **Kunci PIN Independen (Folder & File):**
>    - **Folder BISA dikunci dengan PIN** (wajib PIN saat membuka folder).
>    - **File BISA dikunci dengan PIN** (wajib PIN saat membuka file).
>    - **Kunci PIN Folder dan Kunci PIN File BISA BERBEDA** sesuai kebutuhan privasi Anda.
> 3. **Pembuatan Folder Murni:** Anda dapat membuat folder kosong langsung di aplikasi ataupun menuliskan baris baru di spreadsheet. Folder tersimpan di spreadsheet dan tidak akan hilang saat direfresh.

---

## ⚡ 1. Struktur Kolom Database (Google Sheets)

Buat tabel pada tab pertama (`Daftar Dokumen`) mulai dari **Baris 1**:

| Kolom | Nama Kolom | Wajib / Opsional | Contoh Isi | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **A** | **ID Dokumen** | Opsional | `DOC-1001` atau `FOLDER-01` | ID unik file atau folder. Jika kosong, sistem otomatis membuatnya. |
| **B** | **Nama Dokumen** | Opsional | `Keuangan 2026` atau `Gudang` | Nama file atau nama folder. |
| **C** | **Link Spreadsheet / CSV** | Kondisional | `https://docs.google.com/spreadsheets/d/...` | **Isi link** jika berupa file spreadsheet. **Kosongkan** jika membuat **Folder Murni**. |
| **D** | **Warna Badge** | Opsional | `#2563eb` atau `#10b981` | Kode hex warna badge kartu di aplikasi. |
| **E** | **Nama Folder** | Opsional | `Keuangan` | Nama folder tempat file bernaung. |
| **F** | **Kunci PIN** | Opsional | `9999` (PIN Folder) atau `1234` (PIN File) | **Kunci PIN Keamanan**. Kunci folder dan kunci file di dalamnya bisa berbeda! |
| **G** | **Waktu Upload** | Opsional | `2026-10-13 14:00` | Waktu pencatatan atau pembaruan. |
| **H** | **Keterangan** | Opsional | `Folder Penyimpanan` | Catatan tambahan. |

### 📁 Contoh Baris Nyata di Spreadsheet:

```text
Baris 1: ID Dokumen | Nama Dokumen       | Link Spreadsheet / CSV                | Warna Badge | Nama Folder  | Kunci PIN | Waktu Upload     | Keterangan
Baris 2: FOLDER-01  | Rahasia Keuangan   |                                       |             | Keuangan     | 9999      | 2026-10-13 10:00 | Folder Dikunci PIN 9999
Baris 3: DOC-1001   | Gaji Karyawan      | https://docs.google.com/spreadsheets..| #ef4444     | Keuangan     | 1234      | 2026-10-13 10:05 | File Dikunci PIN 1234
Baris 4: DOC-1002   | Laporan Pajak      | https://docs.google.com/spreadsheets..| #10b981     | Keuangan     |           | 2026-10-13 10:10 | File Publik (Tanpa PIN)
Baris 5: FOLDER-02  | Gudang Umum        |                                       |             | Gudang       |           | 2026-10-13 10:15 | Folder Publik (Tanpa PIN)
```

> 🔐 **Contoh Skenario PIN Berbeda:**
> - Folder `Rahasia Keuangan` dikunci dengan PIN `9999`. Siapa pun yang ingin melihat daftar file di folder ini harus memasukkan `9999`.
> - Di dalam folder tersebut, file `Gaji Karyawan` dikunci dengan PIN `1234`. Hanya staf yang memegang PIN `1234` yang dapat membuka isi tabel gaji.
> - File `Laporan Pajak` di folder yang sama tidak diberi PIN (bebas dibuka siapa saja yang sudah berhasil masuk ke foldernya).

---

## 🔓 2. Langkah 1: Pengaturan Akses Google Sheets

1. Buka spreadsheet database Anda di Google Drive.
2. Klik tombol **Bagikan (Share)** di pojok kanan atas.
3. Di bagian **Akses Umum (General Access)**, ubah menjadi **"Siapa saja yang memiliki link (Anyone with the link)"** sebagai **Pelihat (Viewer)**.
4. Salin tautan spreadsheet tersebut, lalu masukkan ke konfigurasi `data/config.js` (`MASTER_SHEET_URL`).

---

## 🤖 3. Langkah 2: Memasang Google Apps Script Webhook (2-Way Live Sync)

Agar penambahan dokumen, pembuatan folder, penguncian PIN, dan penghapusan data dari HP langsung **otomatis menulis dan memperbarui baris di Google Sheets secara realtime**:

1. Di Google Sheets Anda, klik menu **Ekstensi (Extensions)** &rarr; **Apps Script**.
2. Hapus semua kode yang ada, lalu tempelkan (*paste*) kode lengkap berikut:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Daftar Dokumen") || ss.getSheets()[0];
    var action = data.action || "add";

    // 1. HAPUS DOKUMEN DARI GOOGLE SHEETS
    if (action === "delete") {
      var rows = sheet.getDataRange().getValues();
      var targetId = (data.id || "").toString().toLowerCase();
      var targetUrl = (data.url || "").toString().toLowerCase();

      for (var i = rows.length - 1; i >= 1; i--) {
        var rowId = (rows[i][0] || "").toString().toLowerCase();
        var rowUrl = (rows[i][2] || "").toString().toLowerCase();

        if ((targetId && rowId === targetId) || (targetUrl && rowUrl === targetUrl)) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "delete" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "not_found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. HAPUS FOLDER DARI GOOGLE SHEETS
    else if (action === "delete_folder") {
      var rows = sheet.getDataRange().getValues();
      var targetFolder = (data.folder || data.name || "").toString().toLowerCase();

      for (var i = rows.length - 1; i >= 1; i--) {
        var folderName = (rows[i][4] || rows[i][1] || "").toString().toLowerCase();
        var fileUrl = (rows[i][2] || "").toString().trim();

        // Hapus baris registrasi folder murni
        if (!fileUrl && folderName === targetFolder) {
          sheet.deleteRow(i + 1);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "delete_folder" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. TAMBAH FOLDER BARU KE GOOGLE SHEETS (DENGAN / TANPA PIN)
    else if (action === "add_folder") {
      var folderId = data.id || ("FOLDER-" + Math.floor(Math.random() * 8999 + 1000));
      var folderName = data.folder || data.name || "";
      var folderPin = data.pin || "";
      var time = new Date().toLocaleString("id-ID");
      
      sheet.appendRow([folderId, folderName, "", "", folderName, folderPin, time, "Folder Penyimpanan"]);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "add_folder", id: folderId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. PERBARUI KUNCI PIN FOLDER DI GOOGLE SHEETS
    else if (action === "update_folder_pin") {
      var rows = sheet.getDataRange().getValues();
      var targetFolder = (data.folder || data.name || "").toString().toLowerCase();
      var newPin = data.pin || "";

      for (var i = 1; i < rows.length; i++) {
        var folderName = (rows[i][4] || rows[i][1] || "").toString().toLowerCase();
        var fileUrl = (rows[i][2] || "").toString().trim();

        if (!fileUrl && folderName === targetFolder) {
          sheet.getRange(i + 1, 6).setValue(newPin); // Kolom F: Kunci PIN
          return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "update_folder_pin" }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      // Jika baris folder belum ada, buatkan barisnya
      sheet.appendRow(["FOLDER-" + Math.floor(Math.random() * 8999 + 1000), data.name || data.folder, "", "", data.folder || data.name, newPin, new Date().toLocaleString("id-ID"), "Folder Penyimpanan"]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", action: "update_folder_pin" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 5. TAMBAH ATAU UPDATE DOKUMEN FILE KE GOOGLE SHEETS
    else {
      var docId = data.id || ("DOC-" + Math.floor(Math.random() * 8999 + 1000));
      var name = data.name || "";
      var url = data.url || "";
      var color = data.color || "#2563eb";
      var folder = data.folder || "";
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

3. Klik **Terapkan (Deploy)** &rarr; **Kelola Penerapan (Manage Deployments)** &rarr; klik ikon pensil (Edit) &rarr; ubah versi ke **Versi Baru (New Version)** &rarr; klik **Terapkan**.
4. Pastikan:
   - **Jalankan sebagai (Execute as):** Saya (`Me`)
   - **Siapa yang memiliki akses (Who has access):** Siapa saja (`Anyone`)
5. URL Aplikasi Web webhook Anda telah otomatis terhubung di `data/config.js` (`MASTER_WEBHOOK_URL`).

---

## 🔍 4. Verifikasi Google Search Console (GSC)
Untuk mendaftarkan web `https://anasikhzf.web.app/` ke Google Search Console:
1. Buka [Google Search Console](https://search.google.com/search-console/).
2. Masukkan URL properti: `https://anasikhzf.web.app/`.
3. Pada metode verifikasi **HTML Tag**, salin kode verifikasi (contoh: `google-site-verification=...`).
4. Buka file `index.html` baris ke-16, ganti `GSC_VERIFICATION_CODE_HERE` dengan kode verifikasi Anda.
5. Daftarkan peta situs: Buka menu **Sitemaps** di GSC dan masukkan `sitemap.xml`.
