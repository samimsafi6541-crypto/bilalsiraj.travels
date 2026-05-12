const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const { createStateDb } = require("./sqlite");

let stateDb = null;

function ensureStateDb() {
  if (!stateDb) {
    stateDb = createStateDb({
      userDataPath: app.getPath("userData"),
      Database
    });
  }
  return stateDb;
}

function registerStateIpcHandlers() {
  ipcMain.handle("state:load", async () => {
    const db = ensureStateDb();
    return db.getState("main");
  });

  ipcMain.handle("state:save", async (_event, payload) => {
    const db = ensureStateDb();
    return db.setState(payload, "main");
  });

  ipcMain.handle("state:dbPath", async () => {
    const db = ensureStateDb();
    return db.getDbPath();
  });
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Bilal Siraj Travel & Umrah Services",
    icon: path.join(__dirname, 'app_icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile("index.html");
}

app.whenReady().then(() => {
  registerStateIpcHandlers();
  ensureStateDb();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (stateDb) {
    stateDb.close();
    stateDb = null;
  }
});
