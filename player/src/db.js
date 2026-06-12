'use strict';

// Local SQLite store for the library, rotation, and settings.
//
// Uses Node's built-in `node:sqlite` (Node >= 22.5) — zero native dependencies and
// no build step, which fits the revivability goal: a future owner only needs Node.
// (It currently prints one ExperimentalWarning at startup; see HANDOFF decision log.)
//
// The database and uploads are runtime data — gitignored, never committed (HANDOFF §8, §15).

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.OO_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'openobject.sqlite');

let db = null;

function initDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');

  // Scaffold schema. The library + rotation tables arrive with the upload checkpoint;
  // settings exists now so the store is real and exercised end-to-end.
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  console.log(`SQLite ready (node:sqlite) → ${DB_PATH}`);
  return db;
}

function getDb() {
  return db || initDb();
}

module.exports = { initDb, getDb, DATA_DIR, DB_PATH };
