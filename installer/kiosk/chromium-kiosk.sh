#!/usr/bin/env bash
# Chromium, in kiosk mode, pointed at the OpenObject display page (HANDOFF §6).
#
# Launched by start-kiosk.sh as cage's single Wayland client. Kept as a readable script (not a
# flag soup in the unit file) so flags are easy to tweak at the bench. Append one-off flags at
# the bench without editing this file via OO_CHROMIUM_EXTRA_FLAGS, e.g.:
#   OO_CHROMIUM_EXTRA_FLAGS="--disable-gpu"          # if the iGPU misbehaves
#   OO_CHROMIUM_EXTRA_FLAGS="--no-sandbox"           # if the kernel blocks the sandbox
set -euo pipefail

# Debian ships the binary as `chromium`; some derivatives use `chromium-browser`.
CHROMIUM="$(command -v chromium || command -v chromium-browser || true)"
if [ -z "$CHROMIUM" ]; then
  echo "chromium not found on PATH" >&2
  exit 1
fi

URL="${OO_KIOSK_URL:-http://localhost/display}"
PROFILE="${OO_CHROMIUM_PROFILE:-/var/lib/openobject/chromium}"
mkdir -p "$PROFILE"

# shellcheck disable=SC2086  # OO_CHROMIUM_EXTRA_FLAGS is intentionally word-split.
exec "$CHROMIUM" \
  --kiosk \
  --ozone-platform=wayland \
  --user-data-dir="$PROFILE" \
  --no-first-run \
  --no-default-browser-check \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=Translate,TranslateUI \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --hide-scrollbars \
  --autoplay-policy=no-user-gesture-required \
  --disable-component-update \
  --check-for-update-interval=31536000 \
  --password-store=basic \
  --start-fullscreen \
  ${OO_CHROMIUM_EXTRA_FLAGS:-} \
  "$URL"
