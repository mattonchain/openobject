# CLAUDE.md — OpenObject working rules

Orientation for any Claude (or human) working in this repo. The authoritative
spec is **`docs/HANDOFF.md`** (engineering), mirrored for non-technical owners by
**`docs/SETUP-GUIDE.md`**. Read HANDOFF before non-trivial work.

## What this is
OpenObject is self-hosted replacement software for the **Infinite Objects XXL**
26" square (1:1) digital art frame. It wipes the frame's **MeLE Quieter 3Q** mini
PC and turns it into a clean local art player: shows local images/videos,
controlled from a web page, depends on no external service. Mission: **revivable
by the next stranded XXL owner** — favor "anyone can follow the guide" over
builder-only convenience.

## Hard constraints (this build)
- **No hardware yet.** The MeLE unit is not accessible (waiting on USB hardware).
  **Do not plan around hardware access.** Bias everything toward what runs and is
  visible in a browser on macOS. Hardware work is **Phase 2**, later.
- **Two docs, kept in lockstep.** Any change to user-facing behavior updates
  **`docs/SETUP-GUIDE.md`** in the *same change* as `docs/HANDOFF.md`. The Setup
  Guide must always reflect shipped behavior (HANDOFF §16).
- **§19 placeholders are sacred.** Do **not** invent hardware model numbers, bench
  specs, eMMC sizes, BIOS-entry keys, or Auto-Power-On labels — they come from
  Matt at the bench. Mark unknowns clearly as placeholders. (The logo is now
  supplied — see Branding.)
- **Art never touches the repo.** Uploaded images/videos and the local library are
  gitignored runtime data, never committed (HANDOFF §8, §15).
- **Repo is PRIVATE for now**, intended to go public later when it makes sense. The
  next-owner mission still drives design; going public is a one-step change.

## Git workflow
- Claude runs **all** `git`/`gh` commands; Matt never types them.
- Work in **logical checkpoints**. At each, show staged changes + commit message,
  then commit **and** push together **on Matt's OK**. No per-commit nagging.
- **Outward-facing actions are gated**: creating the repo and pushing always get an
  explicit confirm first.
- Commits carry the standard `Co-Authored-By: Claude` trailer.

## Confirmed v1 decisions
- **Content model: Library + select** (§7). Uploads add to a persistent **Library**;
  the user curates a **Rotation** (an ordered subset) and may **Pin** one clip to
  hold permanently. (Chosen over replace-on-upload.)
- **Stack: Node.js + Express + vanilla HTML/CSS/JS + SQLite. No build step.** One
  language across server and the browser display page; maximally revivable. The app
  lives in `player/`.
- **Display surface: edge-to-edge, zero chrome.** Full-panel black stage
  (`100vw × 100vh`, no margin/padding/border/scrollbars/UI). Media renders to the
  physical edges. **No decorative frame or border, ever.**
- **Render mode: default Fit** (original aspect ratio, `object-fit: contain`);
  **per-clip Fill override** (`object-fit: cover; object-position: center` —
  symmetric center-crop). Fit letterboxes against black — that bare stage is *not* a
  frame. v1 is center-crop only.
- **Rotation order: Sequence / Shuffle / Random.** Sequence = the set order; Shuffle
  = randomized pass, each clip once before repeating; Random = independent random
  pick each advance.
- **Motion + audio: GIF/WebP/AVIF and video loop-to-fill; never freeze on frame 1.
  Muted, always.** Video is either "full length" (play once, then advance) or a
  fixed duration (loop to fill it).
- **Storage: full local mirror by default.** Progressive sync: start the rotation on
  the first clip, fold the rest in without restarting/stuttering the loop. A
  buffered/least-recently-shown eviction mode is a documented seam, off by default.
- **Source layer is a clean interface.** v1 ships **web upload** only. SMB pull and
  the on-chain/NFT resolver are seams — **not built** in v1.
- **Sleep Hours** (optional overnight blank/dim) is a v1 feature.

## Formats (v1)
Supported: **JPEG, PNG, GIF, WebP, AVIF, MP4, MOV**. PNG transparency renders
against black. **Skip** (do not convert, do not error) everything else — HEIC, SVG,
PSD, raw, GLB, and OS noise (`.DS_Store`, office files, etc.). Uploads stay
byte-for-byte.

## Branding
The **OPEN / OBJECT** wordmark lives in `assets/branding/` (optimized opaque PNGs;
large source masters stay in `Logo/`, gitignored). **Phase 1:** vectorize the high-res
master (`Logo/logo-2k.png`, falling back to `logo_orig.png` if the 2k turns out a soft
upscale rather than added detail) with **Potrace → `openobject-logo.svg`** — single-color and
transparent, so CSS recolors it white-on-dark (idle/boot screen) or black-on-light;
derive transparent PNG exports from it as needed. A plain raster color-inverse is
*not* the plan (Matt handles that in Photoshop if ever needed). **SVG here is a
UI/brand asset only** — displayed user *art* in SVG stays deferred per §6. Aesthetic:
understated, functional, no clutter.

## Phases
- **Phase 0** — repo, structure, docs, CLAUDE.md, GitHub. *(done)*
- **Phase 1** *(current)* — the Mac-testable web app: server, library/upload, control
  panel, display page + behaviors, progressive sync, sleep hours, **self-update from
  GitHub**. All visible in a browser on macOS. Hardware-only features
  (Restart/Shutdown, Wi-Fi onboarding) ship as visible-but-inert stubs.
- **Phase 2** *(when hardware arrives)* — lightweight Debian-based Linux, Chromium
  kiosk, Wi-Fi onboarding AP + captive page, mDNS, BIOS Auto-Power-On, real
  restart/shutdown, optional SMB pull, bootable USB installer, prebuilt image as a
  GitHub Release asset. Fill every §19 placeholder from the bench.

## Running the player (Phase 1)
```
cd player && npm install && npm start
```
Then open **http://localhost:3000/display** — the kiosk display (black, edge-to-edge
stage; shows the branded idle screen until art exists). The control panel will live at
**`/`** (currently redirects to the display until built). Display and control panel are
separate routes so Chromium kiosk can point straight at the display later.

Uses Node's built-in **`node:sqlite`** (Node ≥ 22.5) — no native module, no build step.
Runtime data (the library DB under `player/data/`, uploads) is gitignored (HANDOFF §8).
