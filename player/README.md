# player/ — the OpenObject web app

The always-on brain that runs on the frame's mini PC: a small local web server that
serves the **control panel** and the **display page**, stores the **library**, and
drives the rotation. Built with **Node.js + Express + vanilla HTML/CSS/JS + SQLite**,
no build step (see `CLAUDE.md` and HANDOFF §5).

**Status:** Phase 1 — being built and tested on macOS before it ever touches
hardware. Not yet scaffolded.

Once scaffolded it will run with:

```
cd player
npm install
npm start
```

…then open the printed `localhost` URL. The **control panel** and the **display
page** are separate routes, so on the real frame Chromium (kiosk mode) can point
straight at the display page while the owner uses the control panel from any browser.

Runtime data — uploaded art, the library, the SQLite database — is written under
`player/data/` (and similar) and is **gitignored**. Art never belongs in the repo
(HANDOFF §8, §15).
