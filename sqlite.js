const path = require("path");
const fs = require("fs");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

/**
 * Simple SQLite-backed key/value state store.
 * Stores a single JSON blob for id='main'.
 */
function createStateDb({ userDataPath, Database }) {
  ensureDir(userDataPath);
  const dbPath = path.join(userDataPath, "database.db");

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  const getStmt = db.prepare(`SELECT payload FROM app_state WHERE id = ? LIMIT 1`);
  const upsertStmt = db.prepare(`
    INSERT INTO app_state (id, payload, updated_at)
    VALUES (@id, @payload, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      payload = excluded.payload,
      updated_at = excluded.updated_at
  `);

  function getState(id = "main") {
    const row = getStmt.get(id);
    if (!row || !row.payload) return null;
    try {
      return JSON.parse(row.payload);
    } catch {
      return null;
    }
  }

  function setState(payload, id = "main") {
    const now = new Date().toISOString();
    upsertStmt.run({ id, payload: JSON.stringify(payload ?? null), updated_at: now });
    return { ok: true, updatedAt: now, dbPath };
  }

  function getDbPath() {
    return dbPath;
  }

  function close() {
    try {
      db.close();
    } catch {
      // ignore
    }
  }

  return { getState, setState, getDbPath, close };
}

module.exports = { createStateDb };

