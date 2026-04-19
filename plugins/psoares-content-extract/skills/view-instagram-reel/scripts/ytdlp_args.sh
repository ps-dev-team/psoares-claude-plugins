#!/usr/bin/env bash
# Build yt-dlp argument list with cookie auto-detection.
# Usage: source this file, then call `ytdlp_with_cookies <args...>`.
#
# Cookie resolution order:
#   1. $IG_COOKIES_FILE env var (if set and readable)
#   2. ~/.config/instagram/cookies.txt (if exists and non-empty)
#   3. --cookies-from-browser $IG_BROWSER (if set)
#   4. --cookies-from-browser chrome → firefox → safari (first that works)
#   5. No cookies (public posts only — will likely fail on reels)

YTDLP_BIN="${YTDLP_BIN:-}"
if [ -z "$YTDLP_BIN" ]; then
  if command -v yt-dlp >/dev/null 2>&1; then
    YTDLP_BIN="yt-dlp"
  elif [ -x "$HOME/.local/bin/yt-dlp" ]; then
    YTDLP_BIN="$HOME/.local/bin/yt-dlp"
  else
    echo "Error: yt-dlp not found" >&2
    return 1 2>/dev/null || exit 1
  fi
fi

ig_cookie_args() {
  local cookies_file=""

  if [ -n "${IG_COOKIES_FILE:-}" ] && [ -r "$IG_COOKIES_FILE" ]; then
    cookies_file="$IG_COOKIES_FILE"
  elif [ -s "$HOME/.config/instagram/cookies.txt" ]; then
    cookies_file="$HOME/.config/instagram/cookies.txt"
  fi

  if [ -n "$cookies_file" ]; then
    echo "--cookies"
    echo "$cookies_file"
    return 0
  fi

  # Browser fallback
  local browser="${IG_BROWSER:-}"
  if [ -n "$browser" ]; then
    echo "--cookies-from-browser"
    echo "$browser"
    return 0
  fi

  for b in chrome firefox safari brave edge; do
    if "$YTDLP_BIN" --cookies-from-browser "$b" --simulate --quiet --no-warnings "https://www.instagram.com/" >/dev/null 2>&1; then
      echo "--cookies-from-browser"
      echo "$b"
      return 0
    fi
  done

  # No cookies available — caller will probably hit auth errors
  return 0
}
