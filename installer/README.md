# installer/ — bootable USB build

The tooling that turns a lightweight Linux base + the `player/` app into a **bootable
USB installer**, so a non-technical owner can revive a frame by flashing one image
and following the Setup Guide.

**Status:** Phase 2 — **not started.** This work needs the bench hardware (a MeLE
Quieter 3Q is not yet accessible), so nothing here is built or planned in detail
until then. See `CLAUDE.md` and HANDOFF §4 / §15.

Planned outputs (later):
- A repeatable build that produces the installer image.
- The image boots, optionally backs up the original eMMC first, then installs
  OpenObject (Linux + the `player/` stack) configured to boot straight into the
  display with no desktop chrome.
- The finished image is published as a **GitHub Release asset** (large binaries don't
  live in the repo proper).
