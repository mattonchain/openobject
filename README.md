<p align="center">
  <img src="assets/branding/openobject-logo-512.png" alt="OpenObject" width="300">
</p>

# OpenObject

Self-hosted replacement software for the **Infinite Objects XXL**, a 26-inch square digital
art frame whose original solution has decayed. OpenObject wipes the frame's built-in mini PC
and turns it into a clean, local art player you fully control. It shows your own images and
videos, runs from a web page in any browser, and needs no outside service to keep going.

**Website:** [openobject.io](https://openobject.io)

> **Status: working on real hardware.** The web app (control panel and display) and a
> Debian-based installer are built and verified on an actual XXL: the frame boots with no
> desktop straight into the art, reachable at `http://openobject.local`. The source is
> available for **noncommercial use** (see [License](#license)).

## Why

The XXL is a normal x86 mini PC (a MeLE Quieter 3Q) behind a square panel, not a sealed
appliance. The original solution decayed over time and left good hardware stuck. Full credit
to the White Walls app that powered it, the real hero of the whole setup. OpenObject is a
software reflash that brings the hardware back under your control, with two commitments:

1. **Self-contained on the player.** The mini PC is the always-on brain. You upload artwork
   and control the frame's settings from a browser on your phone or any other device, and the
   frame keeps running on its own, with or without it.
2. **Revivable by the next owner.** This is meant as a shareable kit, so anyone with a stranded
   XXL can follow along and bring their own unit back.

## What it does (v1)

- Displays **JPEG, PNG, GIF, AVIF, WebP, SVG, MP4, MOV, WebM**, edge to edge on the square panel,
  with no frame and no border.
- **Library, Rotation, and Pin.** Everything you upload is kept. You choose what plays and in
  what order (**Sequence** or **Shuffle**), and you can pin one piece to hold it permanently.
- **Per-clip control.** One global hold duration, plus **Fit** (the whole image, the default)
  or **Fill** (crop to fill the square).
- **Animated art and video always loop** to fill their time and never freeze on the first
  frame. Silent by design.
- **Sleep hours** to blank the panel overnight.
- Add art by **dragging files onto the control panel** from any device. No accounts, no cloud.
- **Updates itself** from this repo (control panel, then *Check for updates*). No reflash.

## Hardware target

| | |
| --- | --- |
| Frame | Infinite Objects XXL (26-inch, 1:1 square, 1920x1920) |
| Player | MeLE Quieter 3Q, Intel Celeron N5105 (x86-64), Wi-Fi plus Gigabit Ethernet |
| Video path | Captive HDMI from the mini PC to the panel, untouched by the reflash |

## Get started

- **Reviving a frame?** The **[Setup Guide](docs/SETUP-GUIDE.md)** walks the whole thing in
  plain language. Builders can use **[installer/](installer/README.md)**, the bench runbook
  (wipe the eMMC, install minimal Debian, run `install.sh`, boot into the kiosk).
- **Just want to try the app on your computer?** Run `cd player && npm install && npm start`,
  then open `http://localhost:3000/` (needs Node 22.5 or newer).

## Repository layout

```
docs/        engineering spec (HANDOFF) plus the casual SETUP-GUIDE and appendixes
player/      the OpenObject web app (Node and SQLite, no build step)
installer/   the Debian and Chromium-kiosk installer for the frame
assets/      branding (the OpenObject mark)
site/        the openobject.io landing page (static HTML, served via GitHub Pages)
```

## Documentation

- **[Setup Guide](docs/SETUP-GUIDE.md)**: for owners reviving a unit (no engineering).
- **[Handoff / Build Spec](docs/HANDOFF.md)**: the full engineering spec and decision log.
- **[Installer runbook](installer/README.md)**: how the frame is provisioned.
- **[White Walls reset appendix](docs/appendix-whitewalls-reset.md)**: restoring the original
  software, for owners who want it back.

## License

**Source available for noncommercial use.** See the [PolyForm Noncommercial License 1.0.0](LICENSE).

In plain terms: you may use, modify, and share OpenObject to revive and run **your own** frame.
Personal and hobby use is welcome. You **may not** sell it, charge for it, or build it into a
product, service, or other commercial or revenue venture. Because of that noncommercial limit
it is deliberately **not** "open source" in the OSI sense. It is *source available*.

## No warranty

OpenObject is provided **as is**, with **no warranty of any kind**. Installing it **wipes your
device**, and there is no supported way back. It may not work on your unit, it may stop working
after an update or over time, and in the worst case it could leave your frame unusable. You take
that risk yourself.

To the fullest extent permitted by law, the author is **not responsible** for what you do with
OpenObject, for what it does or fails to do, or for any resulting damage, data loss, or other
harm, and makes **no guarantee** that it works or will keep working.

## Independence and trademarks

OpenObject is an independent project, written from scratch. It contains no source code, assets,
or data from the device's original manufacturer or any original software provider, and
incorporates none of it. Installing OpenObject erases the device's storage, removing all
original software and data before OpenObject is installed.

OpenObject is not affiliated with, authorized by, or endorsed by the device's original
manufacturer or any original software provider. Product and company names that appear elsewhere
in this project are the property of their respective owners and are used only to identify the
hardware and the original software OpenObject replaces.
