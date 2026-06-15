# Appendix: Restoring the original "White Walls" software

This is preserved from the vendor's tutorial so a future owner can re-register the
**original** Infinite Objects software *while the vendor's servers still exist*. It is
**not part of OpenObject**, it's offered as a courtesy.

> The most complete way to preserve the original is a **full pre-wipe disk image** of the
> built-in drive, see the **[backup appendix](appendix-backup-original.md)**. That image
> captures the entire original install, not just a registration reset. The steps below only
> reset the app's account registration.

The original software is a standard Android app running in **Waydroid** (a LineageOS
Android 11 container) on **Ubuntu Linux**. To manually reset its account registration (all
inside the Android container's UI):

1. Connect a USB-A **mouse** to the mini PC.
2. Reveal the system menu: **click-and-drag downward from the very top** of the
   screen (this is the Android notification shade, begin the click right at the top
   edge and drag down; it's a little fiddly).
3. Expand the menu and click the **Settings** cog.
4. Go to **Apps & Notifications** → the **White Walls** app → **Storage & Cache** →
   **Clear Storage** → **OK** to delete the app's data.
5. Click the circular **home** button to exit. The unit can now re-register as a new
   White Walls device.
