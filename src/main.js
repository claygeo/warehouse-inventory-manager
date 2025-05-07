// main.js
require('dotenv').config(); // Load environment variables from .env

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { insertData, fetchLocalData, closeDatabase, syncData } = require('./database');
const syncModule = require('./sync');

// Disable hardware acceleration to suppress GPU errors
app.disableHardwareAcceleration();

ipcMain.removeHandler('fetch-data');
ipcMain.handle('fetch-data', async (event, table) => {
  return new Promise((resolve) => {
    fetchLocalData(table, (err, data) => {
      if (err) {
        resolve({ success: false, message: err.message });
      } else {
        resolve({ success: true, data });
      }
    });
  });
});

ipcMain.removeHandler('sync-now');
ipcMain.handle('sync-now', async () => {
  return await syncData();
});

// Add a handler to sign out the user
ipcMain.handle('sign-out', async () => {
  // This will be called from the renderer process
  return { success: true };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: !app.isPackaged,
    },
  });

  const indexPath = path.join(__dirname, 'index.html');
  console.log('Loading index.html from:', indexPath);
  win.loadFile(indexPath).catch((err) => {
    console.error('Failed to load index.html:', err);
    win.loadURL('data:text/html,<h1>Error: Could not load index.html</h1><p>Check the console for details.</p>');
  });

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  syncModule.initSync(win);

  return win;
}

ipcMain.on('save-to-excel', (event, data) => {
  const { table, data: formData } = data;
  insertData(table, formData, (err, id) => {
    if (err) {
      event.reply('save-to-excel-reply', `Error saving to ${table}: ${err.message}`);
    } else {
      event.reply('save-to-excel-reply', `Data saved successfully to ${table}! ID: ${id}`);
    }
  });
});

ipcMain.on('test-excel', (event) => {
  event.reply('test-excel-reply', 'Test message from main process');
});

app.whenReady().then(async () => {
  console.log('App starting, checking for queued data to sync...');
  await syncData();

  const mainWindow = createWindow();

  if (process.platform === 'darwin') {
    const { Menu } = require('electron');
    const appName = app.getName();
    const appVersion = app.getVersion();

    const template = [
      {
        label: appName,
        submenu: [
          { label: `About ${appName}`, role: 'about' },
          { label: `Version ${appVersion}`, enabled: false },
          { type: 'separator' },
          { label: 'Services', role: 'services' },
          { type: 'separator' },
          { label: `Hide ${appName}`, accelerator: 'Command+H', role: 'hide' },
          { label: 'Hide Others', accelerator: 'Command+Alt+H', role: 'hideOthers' },
          { label: 'Show All', role: 'unhide' },
          { type: 'separator' },
          { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

let isDatabaseClosed = false;
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    if (!isDatabaseClosed) {
      isDatabaseClosed = true;
      // Notify the renderer to sign out before closing
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        await win.webContents.executeJavaScript('window.signOutUser()');
      }
      await syncData();
      closeDatabase();
    }
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  if (!isDatabaseClosed) {
    isDatabaseClosed = true;
    // Notify the renderer to sign out before quitting
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      await win.webContents.executeJavaScript('window.signOutUser()');
    }
    await syncData();
    closeDatabase();
  }
});