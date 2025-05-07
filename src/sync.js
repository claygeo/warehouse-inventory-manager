// sync.js
const { syncData } = require('./database');

let syncInterval;

function initSync(win) {
  // Sync every 5 minutes (300,000 ms)
  syncInterval = setInterval(async () => {
    try {
      const result = await syncData();
      win.webContents.send('sync-status', result);
    } catch (err) {
      console.error('Error during periodic sync:', err);
      win.webContents.send('sync-status', { success: false, message: `Sync failed: ${err.message}`, uploaded: 0, failed: 0, downloaded: 0 });
    }
  }, 300000);
}

function stopSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
}

module.exports = { initSync, stopSync };