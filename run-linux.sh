#!/usr/bin/env bash
# Launch Pickr on this Linux box: static server on :8787 + Chrome for Testing with the wall extension loaded.
# Branded Google Chrome (>=137) ignores --load-extension, so this uses the Chrome for Testing build Playwright cached.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-$HOME/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome}"
PROFILE="$ROOT/.chrome-profile"
PORT=8787
export DISPLAY="${DISPLAY:-:1}"

if ! ss -ltn | grep -q ":$PORT "; then
  (cd "$ROOT/docs" && setsid nohup python3 -m http.server $PORT --bind 0.0.0.0 >/tmp/pickr-http.log 2>&1 &)
  sleep 1
fi
mkdir -p "$PROFILE"
setsid nohup "$CHROME" \
  --user-data-dir="$PROFILE" \
  --load-extension="$ROOT/extension" --disable-extensions-except="$ROOT/extension" \
  --no-first-run --no-default-browser-check --remote-debugging-port=9222 \
  --window-size=1500,1000 --window-position=40,40 \
  "http://127.0.0.1:$PORT/" >/tmp/pickr-chrome.log 2>&1 &
echo "Pickr: http://127.0.0.1:$PORT/  (profile: $PROFILE)"
