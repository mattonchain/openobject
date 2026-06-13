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

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Library = every uploaded clip, kept on local storage (HANDOFF §7). The Rotation +
  // Pin (the curated subset shown on the panel) arrive with the control panel.
  db.exec(`
    CREATE TABLE IF NOT EXISTS library (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      filename      TEXT NOT NULL UNIQUE,        -- stored file on disk (UPLOADS_DIR)
      original_name TEXT NOT NULL,               -- name as uploaded, for display
      mime          TEXT,
      format        TEXT NOT NULL,               -- jpeg|png|gif|webp|avif|mp4|mov
      kind          TEXT NOT NULL,               -- still|animated|video (drives behavior)
      bytes         INTEGER NOT NULL,
      width         INTEGER,
      height        INTEGER,
      fit           TEXT NOT NULL DEFAULT 'fit', -- per-clip Fit/Fill (HANDOFF §6)
      duration_ms   INTEGER,                     -- per-clip override; NULL = global default
      video_full    INTEGER NOT NULL DEFAULT 1,  -- video: 1=full length, 0=loop to duration_ms
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  console.log(`SQLite ready (node:sqlite) → ${DB_PATH}`);
  return db;
}

function getDb() {
  return db || initDb();
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

function listLibrary() {
  return getDb().prepare(`SELECT * FROM library ORDER BY id DESC`).all();
}

function getLibraryItem(id) {
  return getDb().prepare(`SELECT * FROM library WHERE id = ?`).get(id);
}

function deleteLibraryItem(id) {
  const row = getLibraryItem(id);
  if (!row) return null;
  getDb().prepare(`DELETE FROM library WHERE id = ?`).run(id);
  return row;
}

module.exports = {
  initDb,
  getDb,
  addLibraryItem,
  listLibrary,
  getLibraryItem,
  deleteLibraryItem,
  DATA_DIR,
  UPLOADS_DIR,
  DB_PATH,
};
