const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bsApp", {
  loadState: () => ipcRenderer.invoke("state:load"),
  saveState: (payload) => ipcRenderer.invoke("state:save", payload),
  getDbPath: () => ipcRenderer.invoke("state:dbPath")
});

