'use strict';

// OpenObject player — web server.
//
// Serves the player's web surfaces from the player itself (HANDOFF §5):
//   • the control panel (/)        — upload + library (rotation/pin/settings land here next)
//   • the display page  (/display) — the edge-to-edge kiosk stage Chromium points at
// No build step: the front-end is plain static files (HANDOFF §5).

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const db = require('./src/db');
const { classify } = require('./src/formats');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // reachable on the LAN (open it from a phone too)

// The repo checkout is the deployment unit (HANDOFF §15) — brand assets live at its root.
const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');

db.initDb(); // ensure the SQLite store + uploads dir exist before serving

const app = express();
app.disable('x-powered-by');

// Static front-end, brand assets, and the uploaded art itself.
app.use(express.static(PUBLIC_DIR));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/uploads', express.static(db.UPLOADS_DIR));

// ── Uploads — the default web-upload source (HANDOFF §8) ─────────────
// Files are stored byte-for-byte. Unsupported types are skipped silently (§6): the
// filter drops them (never written) and records the name so the response can report it.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, db.UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const info = classify(file.originalname); // non-null: fileFilter already accepted it
    const stamp = Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex');
    cb(null, `${stamp}.${info.format}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (classify(file.originalname)) return cb(null, true);
    (req.skipped ||= []).push(file.originalname); // unsupported → skip, don't error
    cb(null, false);
  },
});

app.post('/api/upload', upload.array('files'), (req, res) => {
  const added = (req.files || []).map((f) => {
    const info = classify(f.originalname);
    return db.addLibraryItem({
      filename: f.filename,
      original_name: f.originalname,
      mime: info.mime,
      format: info.format,
      kind: info.kind,
      bytes: f.size,
    });
  });
  res.json({ added, skipped: req.skipped || [] });
});

// ── Library API ─────────────────────────────────────────────────────
app.get('/api/library', (_req, res) => {
  res.json(db.listLibrary());
});

app.delete('/api/library/:id', (req, res) => {
  const row = db.deleteLibraryItem(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'not found' });
  fs.rm(path.join(db.UPLOADS_DIR, row.filename), { force: true }, () => {}); // best-effort file removal
  res.json({ deleted: row.id });
});

// ── Pages ───────────────────────────────────────────────────────────
// The kiosk display surface (HANDOFF §6). In Phase 2 Chromium boots straight to this.
app.get('/display', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'display.html'));
});

// The control panel home (HANDOFF §5). Minimal for now: upload + library.
app.get('/', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'control.html'));
});

// Liveness probe — also how the Phase-1 self-update flow confirms the player came back
// up after restarting itself.
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, app: 'openobject', version: require('./package.json').version });
});

// JSON error responses for the API (e.g. multer rejections) instead of HTML stack traces.
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message });
});

app.listen(PORT, HOST, () => {
  console.log(`OpenObject player listening on http://localhost:${PORT}`);
  console.log(`  • control  →  http://localhost:${PORT}/`);
  console.log(`  • display  →  http://localhost:${PORT}/display`);
});
