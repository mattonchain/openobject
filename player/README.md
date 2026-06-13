# player/ — the OpenObject web app

The always-on brain that runs on the frame's mini PC: a small local web server that
serves the **control panel** and the **display page**, stores the **library**, and
drives the rotation. Built with **Node.js + Express + vanilla HTML/CSS/JS + SQLite**,
no build step (see `CLAUDE.md` and HANDOFF §5).

**Status:** Phase 1 — being built and tested on macOS before it ever touches
hardware. Built so far: the Express server, the SQLite store (Node's built-in
`node:sqlite`, no native build step), the black edge-to-edge **display page** (idle
state), and the **control panel** with **web upload + Library** (add, list, delete;
format-gated). The rotation/pin curation, per-clip durations + Fit/Fill, the display
rotation engine, sleep hours, and self-update come next.

Run it with:

```
cd player
npm install
npm start
```

…then open **http://localhost:3000/** — the **control panel** (web upload + Library so
far). The kiosk **display** is at **/display** (the black, edge-to-edge stage). They're
separate routes so on the real frame Chromium (kiosk mode) can point straight at the
display while the owner uses the control panel from any browser.

Runtime data — uploaded art, the library, the SQLite database — is written under
`player/data/` (and similar) and is **gitignored**. Art never belongs in the repo
(HANDOFF §8, §15).
