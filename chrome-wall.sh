#!/usr/bin/env bash
# Start Google Chrome (your normal "Spencer" profile, same logins) with Chrome's autoplay rule relaxed,
# so wall panes can play and unmute with no clicks. Opens the Pickr board.
# Chrome must not already be running: a running Chrome would swallow the new window with the old settings.
BOARD="http://127.0.0.1:8787/"
if pgrep -x chrome >/dev/null || pgrep -f "opt/google/chrome/chrome" >/dev/null; then
  msg="Quit Chrome completely first (Chrome menu → Exit, or close every window), then launch Chrome (Pickr) again."
  command -v notify-send >/dev/null && notify-send "Pickr" "$msg" || echo "$msg" >&2
  exit 1
fi
exec google-chrome --profile-directory=Default --autoplay-policy=no-user-gesture-required --new-window "$BOARD" "$@"
