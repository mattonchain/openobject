'use strict';

// Local SQLite store for the library, rotation, and settings.
//
// Uses Node's built-in `node:sqlite` (Node >= 22.5) — zero native dependencies and no
// build step, which fits the revivability goal: a future owner only needs Node. All DB
// access is contained in this one file, so swapping to better-sqlite3 later (should the
// experimental API ever churn) stays a localized change.
//
// The database and uploads are runtime data — gitignored, never committed (HANDOFF §8, §15).

const path = require('path');
const fs = require('fs');

// node:sqlite is stable underneath (it IS SQLite), but Node still tags the *JS API*
// "experimental" and prints one startup warning. The frame owner never sees server logs;
// we silence ONLY that one line so the builder's boot log stays clean — every other Node
// warning (deprecations, etc.) still prints. Must run before node:sqlite is loaded.
const _emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...rest) => {
  const opt = rest[0];
  const type = typeof opt === 'string' ? opt : opt && opt.type;
  const msg = typeof warning === 'string' ? warning : warning && warning.message;
  if (type === 'ExperimentalWarning' && msg && msg.includes('SQLite')) return;
  return _emitWarning(warning, ...rest);
};
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.OO_DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOADS_DIR = process.env.OO_UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const DB_PATH = path.join(DATA_DIR, 'openobject.sqlite');

let db = null;

function initDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');

  // Global settings (duration, rotation order, …) as simple key/value rows.
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Library = every uploaded clip (HANDOFF §7). Fit/Fill is per-clip (§6). Duration is
  // global/equal-time (a single setting), so there is intentionally no per-clip duration.
  db.exec(`
    CREATE TABLE IF NOT EXISTS library (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      filename      TEXT NOT NULL UNIQUE,        -- stored file on disk (UPLOADS_DIR)
      original_name TEXT NOT NULL,               -- name as uploaded, for display
      mime          TEXT,
      format        TEXT NOT NULL,               -- jpeg|png|gif|avif|webp|mp4|mov|webm
      kind          TEXT NOT NULL,               -- still|animated|video (drives behavior)
      bytes         INTEGER NOT NULL,
      width         INTEGER,
      height        INTEGER,
      fit           TEXT NOT NULL DEFAULT 'fit', -- per-clip Fit/Fill (HANDOFF §6)
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log(`SQLite ready (node:sqlite) → ${DB_PATH}`);
  return db;
}

function getDb() {
  return db || initDb();
}

// ── Settings (key/value) ────────────────────────────────────────────
function getSetting(key, fallback) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setSetting(key, value) {
  getDb()
    .prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}

// ── Library queries ─────────────────────────────────────────────────
function addLibraryItem(item) {
  const info = getDb()
    .prepare(
      `INSERT INTO library (filename, original_name, mime, format, kind, bytes, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      item.filename,
      item.original_name,
      item.mime ?? null,
      item.format,
      item.kind,
      item.bytes,
      item.width ?? null,
      item.height ?? null
    );
  return getLibraryItem(Number(info.lastInsertRowid));
}

// Control grid shows newest first; the display rotation plays in stable upload order.
function listLibrary() {
  return getDb().prepare('SELECT * FROM library ORDER BY id DESC').all();
}
function listRotation() {
  return getDb().prepare('SELECT * FROM library ORDER BY id ASC').all();
}

function getLibraryItem(id) {
  return getDb().prepare('SELECT * FROM library WHERE id = ?').get(id);
}

function setLibraryFit(id, fit) {
  if (!getLibraryItem(id)) return null;
  getDb().prepare('UPDATE library SET fit = ? WHERE id = ?').run(fit, id);
  return getLibraryItem(id);
}

function deleteLibraryItem(id) {
  const row = getLibraryItem(id);
  if (!row) return null;
  getDb().prepare('DELETE FROM library WHERE id = ?').run(id);
  return row;
}

module.exports = {
  initDb,
  getDb,
  getSetting,
  setSetting,
  addLibraryItem,
  listLibrary,
  listRotation,
  getLibraryItem,
  setLibraryFit,
  deleteLibraryItem,
  DATA_DIR,
  UPLOADS_DIR,
  DB_PATH,
};
