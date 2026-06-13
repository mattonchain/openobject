'use strict';

// OpenObject player — web server.
//
// Serves the player's web surfaces from the player itself (HANDOFF §5):
//   • the control panel (/)        — upload, library, rotation settings, pin
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

// Rotation defaults (HANDOFF §7, §12): one global equal-time duration; order mode.
const DEFAULT_DURATION_MS = 8000;
const DEFAULT_MODE = 'sequence';
const MODES = new Set(['sequence', 'shuffle']);
const FITS = new Set(['fit', 'fill']);

db.initDb(); // ensure the SQLite store + uploads dir exist before serving

const app = express();
app.disable('x-powered-by');
app.use(express.json());

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

// Per-clip Fit/Fill (HANDOFF §6).
app.patch('/api/library/:id', (req, res) => {
  const { fit } = req.body || {};
  if (!FITS.has(fit)) return res.status(400).json({ error: 'fit must be "fit" or "fill"' });
  const row = db.setLibraryFit(Number(req.params.id), fit);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

app.delete('/api/library/:id', (req, res) => {
  const row = db.deleteLibraryItem(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'not found' });
  if (Number(db.getSetting('pinned_id', '')) === row.id) db.setSetting('pinned_id', ''); // drop a stale pin
  fs.rm(path.join(db.UPLOADS_DIR, row.filename), { force: true }, () => {}); // best-effort file removal
  res.json({ deleted: row.id });
});

// ── Rotation settings (global, equal-time) + Pin ────────────────────
function currentSettings() {
  const pin = db.getSetting('pinned_id', '');
  return {
    durationMs: Number(db.getSetting('duration_ms', DEFAULT_DURATION_MS)) || DEFAULT_DURATION_MS,
    mode: db.getSetting('rotation_mode', DEFAULT_MODE),
    pinnedId: pin ? Number(pin) : null, // one piece held permanently (HANDOFF §7), or null
  };
}

app.get('/api/settings', (_req, res) => res.json(currentSettings()));

app.put('/api/settings', (req, res) => {
  const { durationMs, mode } = req.body || {};
  if (durationMs !== undefined) {
    const ms = Number(durationMs);
    if (!Number.isFinite(ms) || ms < 1000) return res.status(400).json({ error: 'durationMs must be >= 1000' });
    db.setSetting('duration_ms', Math.round(ms));
  }
  if (mode !== undefined) {
    if (!MODES.has(mode)) return res.status(400).json({ error: 'mode must be sequence|shuffle' });
    db.setSetting('rotation_mode', mode);
  }
  res.json(currentSettings());
});

// Pin one piece (hold it on the panel permanently); DELETE to unpin and resume rotation.
app.put('/api/pin/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!db.getLibraryItem(id)) return res.status(404).json({ error: 'not found' });
  db.setSetting('pinned_id', id);
  res.json(currentSettings());
});
app.delete('/api/pin', (_req, res) => {
  db.setSetting('pinned_id', '');
  res.json(currentSettings());
});

// What the display page plays: the rotation (whole Library, upload order) + settings + pin.
app.get('/api/display', (_req, res) => {
  res.json({ items: db.listRotation(), ...currentSettings() });
});

// ── Pages ───────────────────────────────────────────────────────────
// The kiosk display surface (HANDOFF §6). In Phase 2 Chromium boots straight to this.
app.get('/display', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'display.html'));
});

// The control panel home (HANDOFF §5).
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
