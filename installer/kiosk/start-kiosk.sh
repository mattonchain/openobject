#!/usr/bin/env bash
# OpenObject kiosk launcher (HANDOFF §6).
#
# Runs inside the openobject-kiosk systemd unit. It (1) makes sure the Wayland runtime dir is
# set, (2) waits for the player to answer /healthz so the browser never opens on a dead port,
# then (3) hands off to `cage`, the Wayland kiosk compositor, which runs Chromium fullscreen.
set -euo pipefail

# logind normally sets this for the PAM session; default it just in case.
: "${XDG_RUNTIME_DIR:=/run/user/$(id -u)}"
export XDG_RUNTIME_DIR

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEALTH_URL="${OO_HEALTH_URL:-http://localhost/healthz}"

# Wait for the player (up to ~60s). The page self-heals afterward regardless, so this only
# avoids the initial "can't reach the server" flash on a cold boot.
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null --max-time 2 "$HEALTH_URL"; then
    break
  fi
  sleep 1
done

# cage runs a single client fullscreen and exits when it exits (systemd then relaunches us).
exec cage -- "$HERE/chromium-kiosk.sh"
