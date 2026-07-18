// Pont sécurisé renderer <-> Electron (contextIsolation ON)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sfpc', {
  /** Impression système (Ctrl+P / bouton reçu) */
  print: () => ipcRenderer.invoke('sf:print'),
  /** Actions envoyées par le menu (Nouvelle vente Ctrl+N…) */
  onAction: (cb) => ipcRenderer.on('sf:action', (_e, action) => cb(action)),
  /** 🖨 v1.2 : impression thermique 80 mm */
  thermal: {
    list: () => ipcRenderer.invoke('sf:printers'),
    printNet: (opts) => ipcRenderer.invoke('sf:print-escpos', opts),
    printSilent: (opts) => ipcRenderer.invoke('sf:print-silent', opts),
  },
  /** 📄 v1.3 : rapport HTML → fichier PDF A4 + boîte d'enregistrement */
  pdf: {
    save: (opts) => ipcRenderer.invoke('sf:pdf-save', opts),
  },
  /** 📤 v2.0 : écriture fichier texte (CSV du pack jour) — auto ou boîte native */
  file: {
    save: (opts) => ipcRenderer.invoke('sf:file-save', opts),
  },
  isElectron: true,
});
