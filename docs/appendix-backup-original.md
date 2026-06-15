# Appendix: Back up the original software (optional)

> **Optional.** Your frame's original setup is already unreliable: the
> backend services it relied on have wound down, so installing OpenObject **cannot make your
> frame any less usable than it already is**. This
> appendix shows how to copy the original drive onto an external drive *before* you wipe it,
> in case you ever want to tinker with it while the vendor's servers still exist.
> **No restore instructions are provided anywhere**, putting the original back is not
> supported, and you would be entirely on your own to work it out. **Most owners can skip
> this.**

## What you need (on top of the main setup)

- An **external USB drive, 128 GB or larger** (a USB SSD is ideal; a USB hard drive also
  works). **exFAT** format is best, it works on Mac, Windows, and the frame, and holds the
  large image file. The backup is about **117 GB**, and it's just *added* to the drive,
  nothing already on the drive is touched.

## Steps

You do this from the same **Ubuntu live USB** the main install uses, just choose **Try
Ubuntu** instead of installing, and stop before wiping anything.

1. **Boot the live USB** and pick **Try Ubuntu** (per the main guide). Connect to your
   **Wi-Fi** from the top-right menu, you'll need internet to fetch the backup tool.
2. **Open a Terminal** and look at the drives:
   ```
   lsblk -e7 -o NAME,SIZE,FSTYPE,TRAN,MODEL
   ```
   - The frame's **built-in drive** is **`mmcblk0`** (about **116 GiB**). This is the one we copy.
   - Your **external drive** is the `sd?` entry that matches its size (e.g. `sdb`), with a
     data partition under it (e.g. `sdb2`).
3. **Mount your external drive**, replace `sdb2` with *your* drive's data partition, and
   mind the space between the two paths:
   ```
   sudo mkdir -p /mnt/backup
   sudo mount /dev/sdb2 /mnt/backup
   df -h /mnt/backup
   ```
   Confirm it shows your drive with plenty free (**≥120 GB**).
4. **Copy the original drive to an image file:**
   ```
   sudo apt install -y gddrescue
   cd /mnt/backup
   sudo ddrescue /dev/mmcblk0 xxl-emmc.img xxl-emmc.map
   ```
   This reads the original drive **read-only** (it is never modified) and writes a ~117 GB
   file, `xxl-emmc.img`, onto your external drive, it writes a *file*, never to a raw drive,
   so there's no way to clobber the wrong disk. It shows live progress and takes roughly
   **20–40 minutes** over USB. Wait for it to finish with **`errors: 0`**.

   > *No Wi-Fi in the live session?* Skip the `apt install` and use the built-in tool:
   > `cd /mnt/backup && sudo dd if=/dev/mmcblk0 of=xxl-emmc.img bs=4M status=progress`
   > (same result; just no automatic resume if it's interrupted).
5. **Done, shut down and remove the drives:**
   ```
   sudo poweroff
   ```
   When the screen goes black, unplug the external drive and the USB stick. Your backup is
   the **`xxl-emmc.img`** file on the external drive.

> This image is a **complete copy** of the original install, far more than the account
> reset in the [White Walls appendix](appendix-whitewalls-reset.md). Store it somewhere
> safe. There is no supported way to put it back, but with this image you at least keep the
> original bytes.
