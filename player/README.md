# player/ — the OpenObject web app

The always-on brain that runs on the frame's mini PC: a small local web server that
serves the **control panel** and the **display page**, stores the **library**, and
drives the rotation. Built with **Node.js + Express + vanilla HTML/CSS/JS + SQLite**,
no build step (see `CLAUDE.md` and HANDOFF §5).

**Status:** Phase 1 — being built and tested on macOS before it ever touches
hardware. Scaffolded so far: the Express server, the SQLite store (Node's built-in
`node:sqlite`, no native build step), and the black edge-to-edge **display page**
showing the idle / empty-library state. Upload + library, the control panel, and the
rotation behaviors come next.

Run it with:

```
cd player
npm install
npm start
```

…then open **http://localhost:3000/display** — the kiosk display (the black,
edge-to-edge stage). The **control panel** will live at **`/`** (for now it redirects
to the display until it's built). They're separate routes so on the real frame Chromium
(kiosk mode) can point straight at the display while the owner uses the control panel
from any browser.

Runtime data — uploaded art, the library, the SQLite database — is written under
`player/data/` (and similar) and is **gitignored**. Art never belongs in the repo
(HANDOFF §8, §15).
