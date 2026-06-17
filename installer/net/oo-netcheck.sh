#!/bin/sh
# OpenObject Wi-Fi watchdog (HANDOFF §3, §20): re-up Wi-Fi only when the frame has lost its
# network. The installed frame's Wi-Fi is brought up once at boot by ifupdown (allow-hotplug +
# wpa_supplicant), which does NOT retry: a cold boot where the radio or the access point isn't
# ready in time can leave the frame display-but-no-network until a manual power-cycle. A systemd
# timer runs this every ~30s; it acts ONLY when there is already no connectivity, so it can never
# disturb a working connection (or an SSH session): there is nothing to disturb when it fires.
#
# Device-agnostic on purpose: it finds the wireless interface itself, so it also serves the next
# owner's hardware, not just this frame's wlp0s20f3.
set -u

log() { logger -t openobject-netcheck "$*" 2>/dev/null || true; }

# The wireless interface, discovered generically (sysfs marks Wi-Fi devices with phy80211).
wifi_dev=""
for d in /sys/class/net/*; do
  if [ -e "$d/phy80211" ] || [ -e "$d/wireless" ]; then
    wifi_dev=$(basename "$d")
    break
  fi
done
[ -n "$wifi_dev" ] || exit 0   # no Wi-Fi device (e.g. an Ethernet-only frame): nothing to watch

online() {
  # Down if there is no default route, or the default gateway does not answer.
  gw=$(ip route show default 2>/dev/null | awk '/default/ {print $3; exit}')
  [ -n "$gw" ] || return 1
  ping -c 1 -W 2 "$gw" >/dev/null 2>&1
}

# Hysteresis: ignore a momentary blip, acting only if two checks ~5s apart both fail.
online && exit 0
sleep 5
online && exit 0

log "no LAN connectivity via $wifi_dev, re-upping Wi-Fi"
ifdown --force "$wifi_dev" >/dev/null 2>&1
ifup "$wifi_dev" >/dev/null 2>&1 || log "ifup $wifi_dev failed"
