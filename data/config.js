// Configuration for Centralized Google Sheets Cloud Database

export const CONFIG = {
  // Default Master Google Sheets URL for multi-device live sync
  MASTER_SHEET_URL: "https://docs.google.com/spreadsheets/d/1w8V3UZ7U7ng14hOM4mOy48qgwbIU3XYHda3jVgtHE_o/edit?usp=sharing",

  // Optional Google Apps Script Webhook URL for auto-writing when adding documents via app UI
  MASTER_WEBHOOK_URL: "https://script.google.com/macros/s/AKfycbxTNCGFezczZM4i1seYBwfdeQumkaqVGthzqmms3G57J_4ki34zlY35q9naiNbvQmc/exec",

  // Storage key for user dynamic Master Sheet URL
  STORAGE_KEY_MASTER_URL: "caridata_master_sheet_url",

  // Auto refresh interval in background (milliseconds) - Default: 5 minutes
  AUTO_SYNC_INTERVAL_MS: 300000
};
