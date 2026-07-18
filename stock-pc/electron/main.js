// ============================================================
// StockFlow PC — processus principal Electron
// Fenêtre sombre premium, menu FR minimal, impression système.
// ============================================================
const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const fs = require('fs');
const net = require('net');
const path = require('path');

// 📸 v2.4 : expose BarcodeDetector (scan code-barres webcam) dans le renderer.
// Switch inoffensif pour le reste ; avant app.whenReady comme exigé par Chromium.
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0B0F1A',
    title: 'StockFlow',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  // Liens externes (reçus PDF ™…) → navigateur système, jamais dans l'app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  buildMenu();
}

function sendAction(action) {
  mainWindow?.webContents.send('sf:action', action);
}

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Nouvelle vente', accelerator: 'CmdOrCtrl+N', click: () => sendAction('new-sale') },
        { type: 'separator' },
        {
          label: 'Imprimer…',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.print({ silent: false, printBackground: true }),
        },
        { type: 'separator' },
        { label: 'Quitter', role: 'quit' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', role: 'reload' },
        { label: 'Zoom +', role: 'zoomIn' },
        { label: 'Zoom −', role: 'zoomOut' },
        { label: 'Taille réelle', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Outils de développement', role: 'toggleDevTools' },
        { label: 'Plein écran', role: 'togglefullscreen' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Impression silencieuse optionnelle (appelée depuis l'écran reçu)
ipcMain.handle('sf:print', async () => {
  if (!mainWindow) return false;
  await new Promise((resolve) =>
    mainWindow.webContents.print({ silent: false, printBackground: true }, () => resolve())
  );
  return true;
});

// ---------------- 🖨 v1.2 : impression thermique ----------------

/** Liste des imprimantes système installées (pilotes OS) */
ipcMain.handle('sf:printers', async () => {
  if (!mainWindow) return [];
  const list = await mainWindow.webContents.getPrintersAsync();
  return list.map((p) => ({ name: p.name, isDefault: p.isDefault ?? false }));
});

/** ESC/POS réseau : envoi brut sur IP:9100, zéro pilote (imprimantes Ethernet/Wi-Fi) */
ipcMain.handle('sf:print-escpos', (_e, { ip, port, payload } = {}) => new Promise((resolve, reject) => {
  if (!ip || !Array.isArray(payload) || !payload.length) {
    reject(new Error('Paramètres d’impression invalides.'));
    return;
  }
  const socket = net.createConnection({ host: ip, port: Number(port) || 9100, timeout: 6000 });
  const fail = (msg) => { socket.destroy(); reject(new Error(msg)); };
  socket.once('timeout', () => fail('timeout (6s)'));
  socket.once('error', (err) => fail(err.code || 'connexion impossible'));
  socket.once('connect', () => {
    socket.write(Buffer.from(payload), (err) => {
      if (err) { fail(err.code || 'écriture impossible'); return; }
      socket.end(() => { socket.destroy(); resolve(true); });
    });
  });
}));

/** Impression silencieuse via le spooler OS (imprimante USB installée, sans boîte de dialogue) */
ipcMain.handle('sf:print-silent', async (_e, { deviceName, html } = {}) => {  const win = new BrowserWindow({
    show: false, width: 320, height: 480,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html ?? ''));
    return await new Promise((resolve, reject) => {
      win.webContents.print(
        {
          silent: true, printBackground: true,
          deviceName: deviceName || undefined,
          pageSize: { width: 80000, height: 220000 }, // 80 mm × 220 mm (µm)
        },
        (success, failureReason) => (success
          ? resolve(true)
          : reject(new Error(failureReason || 'impression annulée'))));
    });
  } finally {
    win.destroy();
  }
});

/** 📄 v1.3 : HTML → vrai fichier PDF A4 (rapport patron) via printToPDF + save dialog
 *  🤖 v1.4 : {auto:true} → ZÉRO dialogue, écrit dans Documents/StockFlow/Rapports
 *  (1 fichier par jour, remplacé silencieusement si re-clôture). */
ipcMain.handle('sf:pdf-save', async (_e, { html, defaultName, auto } = {}) => {
  const win = new BrowserWindow({
    show: false, width: 794, height: 1123, // A4 @96dpi
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html ?? ''));
    const data = await win.webContents.printToPDF({ pageSize: 'A4', printBackground: true });
    let filePath;
    if (auto === true) {
      const dir = path.join(app.getPath('documents'), 'StockFlow', 'Rapports');
      fs.mkdirSync(dir, { recursive: true });
      filePath = path.join(dir, defaultName || `rapport-stockflow-${new Date().toISOString().slice(0, 10)}.pdf`);
    } else {
      const { canceled, filePath: picked } = await dialog.showSaveDialog(mainWindow, {
        title: 'Enregistrer le rapport PDF',
        defaultPath: path.join(app.getPath('documents'), defaultName || 'rapport-stockflow.pdf'),
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (canceled || !picked) return { saved: false };
      filePath = picked;
    }
    fs.writeFileSync(filePath, data);
    // 📧 v2.1 : en mode auto, le PDF est renvoyé en base64 → envoi email au patron sans relire le disque
    return { saved: true, path: filePath, auto: auto === true, ...(auto === true ? { data64: data.toString('base64') } : {}) };
  } finally {
    win.destroy();
  }
});

// 📤 v2.0 : écriture fichier générique (CSV des ventes du jour joint au pack)
// auto:true → Documents/StockFlow/Rapports, zéro dialogue, 1 fichier remplacé ;
// sinon boîte d'enregistrement native.
ipcMain.handle('sf:file-save', async (_e, { name, content, auto } = {}) => {
  let filePath;
  if (auto === true) {
    const dir = path.join(app.getPath('documents'), 'StockFlow', 'Rapports');
    fs.mkdirSync(dir, { recursive: true });
    filePath = path.join(dir, name || `stockflow-${new Date().toISOString().slice(0, 10)}.txt`);
  } else {
    const { canceled, filePath: picked } = await dialog.showSaveDialog(mainWindow, {
      title: 'Enregistrer le fichier',
      defaultPath: path.join(app.getPath('documents'), name || 'stockflow.txt'),
    });
    if (canceled || !picked) return { saved: false };
    filePath = picked;
  }
  fs.writeFileSync(filePath, content ?? '', 'utf8');
  return { saved: true, path: filePath, auto: auto === true };
});

// Instance unique (gain en boutique : pas d'empilement de fenêtres)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
