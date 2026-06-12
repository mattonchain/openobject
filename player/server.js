'use strict';

// OpenObject player — web server.
//
// Serves two web surfaces from the player itself (HANDOFF §5):
//   • the display page  (/display) — the edge-to-edge kiosk stage Chromium points at
//   • the control panel (/)        — added next checkpoint; for now '/' forwards to the display
// No build step: the front-end is plain static files (HANDOFF §5).

const path = require('path');
const express = require('express');
const { initDb } = require('./src/db');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // reachable on the LAN (open it from a phone too)

// The repo checkout is the deployment unit (HANDOFF §15) — brand assets live at its root.
const REPO_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');

const app = express();
app.disable('x-powered-by');

// Static front-end + brand assets (logo, idle/boot marks).
app.use(express.static(PUBLIC_DIR));
app.use('/assets', express.static(ASSETS_DIR));

// The kiosk display surface (HANDOFF §6). In Phase 2 Chromium boots straight to this.
app.get('/display', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'display.html'));
});

// Liveness probe — also how the Phase-1 self-update flow confirms the player came back
// up after restarting itself.
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, app: 'openobject', version: require('./package.json').version });
});

// Until the control panel exists, the root forwards to the display so opening the
// player in a browser shows the stage.
app.get('/', (_req, res) => res.redirect('/display'));

initDb(); // ensure the local SQLite store exists (library/rotation tables land with uploads)

app.listen(PORT, HOST, () => {
  console.log(`OpenObject player listening on http://localhost:${PORT}`);
  console.log(`  • display  →  http://localhost:${PORT}/display`);
});
