#!/usr/bin/env bash
# clip-youtube-video — download a YouTube video, optionally trimmed to a range.
#
# Uses yt-dlp's --download-sections so partial downloads don't pull the whole
# video. Requires ffmpeg (yt-dlp shells out to it for segment extraction).
#
# Usage:
#   clip.sh <url> [--start <ts>] [--end <ts>] [--quality auto|1080|720|480|audio] [--out <path>]
#
# Timestamps accept yt-dlp's syntax: hh:mm:ss, mm:ss, or seconds.
# When --start and --end are both omitted, the full video is downloaded.

set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "Usage: clip.sh <youtube_url> [--start <ts>] [--end <ts>] [--quality auto|1080|720|480|audio] [--out <path>]" >&2
  exit 1
fi
shift || true

START=""
END=""
QUALITY="auto"
OUT_PATH=""

while [ $# -gt 0 ]; do
  case "$1" in
    --start) START="$2"; shift 2 ;;
    --end) END="$2"; shift 2 ;;
    --quality) QUALITY="$2"; shift 2 ;;
    --out) OUT_PATH="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=require.sh
source "$SCRIPT_DIR/require.sh"

require_bin yt-dlp "brew install yt-dlp  (or: pip install --user yt-dlp)"
require_bin ffmpeg "brew install ffmpeg"

YTDLP="${YTDLP_BIN:-yt-dlp}"
if ! command -v "$YTDLP" >/dev/null 2>&1 && [ -x "$HOME/.local/bin/yt-dlp" ]; then
  YTDLP="$HOME/.local/bin/yt-dlp"
fi

# Extract video ID
VIDEO_ID=$(echo "$URL" | grep -oE '[A-Za-z0-9_-]{11}' | head -1)
if [ -z "$VIDEO_ID" ]; then
  echo "Error: could not extract video ID from: $URL" >&2
  exit 1
fi

# ── Format selector based on quality choice ──────────────────────────────────
case "$QUALITY" in
  auto|"")
    FORMAT="bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
    EXT="mp4"
    ;;
  1080)
    FORMAT="bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]"
    EXT="mp4"
    ;;
  720)
    FORMAT="bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]"
    EXT="mp4"
    ;;
  480)
    FORMAT="bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]"
    EXT="mp4"
    ;;
  audio)
    FORMAT="bestaudio[ext=m4a]/bestaudio"
    EXT="m4a"
    ;;
  *)
    echo "Error: unknown --quality '$QUALITY' (expected auto|1080|720|480|audio)" >&2
    exit 1
    ;;
esac

# ── Default output path ──────────────────────────────────────────────────────
CACHE_ROOT="${PSOARES_CONTENT_CACHE:-$HOME/.cache/psoares-content-extract}"
if [ -z "$OUT_PATH" ]; then
  CLIPS_DIR="$CACHE_ROOT/youtube/$VIDEO_ID/clips"
  mkdir -p "$CLIPS_DIR"
  if [ -n "$START" ] || [ -n "$END" ]; then
    # Sanitize timestamps for filename: ":" → "-", strip spaces
    safe_start=$(echo "${START:-start}" | tr ':' '-' | tr -d ' ')
    safe_end=$(echo "${END:-end}" | tr ':' '-' | tr -d ' ')
    OUT_PATH="$CLIPS_DIR/${safe_start}_to_${safe_end}.${EXT}"
  else
    OUT_PATH="$CACHE_ROOT/youtube/$VIDEO_ID/${VIDEO_ID}-full.${EXT}"
  fi
else
  # If OUT_PATH is a directory, append a sensible default filename
  if [ -d "$OUT_PATH" ]; then
    if [ -n "$START" ] || [ -n "$END" ]; then
      safe_start=$(echo "${START:-start}" | tr ':' '-' | tr -d ' ')
      safe_end=$(echo "${END:-end}" | tr ':' '-' | tr -d ' ')
      OUT_PATH="$OUT_PATH/${VIDEO_ID}_${safe_start}_to_${safe_end}.${EXT}"
    else
      OUT_PATH="$OUT_PATH/${VIDEO_ID}-full.${EXT}"
    fi
  fi
  mkdir -p "$(dirname "$OUT_PATH")"
fi

# ── Build yt-dlp command ─────────────────────────────────────────────────────
YT_ARGS=(--no-warnings -f "$FORMAT" -o "$OUT_PATH")

# Partial download via --download-sections when either bound is set
if [ -n "$START" ] || [ -n "$END" ]; then
  SECTION="*${START:-0}-${END:-inf}"
  # --force-keyframes-at-cuts re-encodes tiny bits around cuts for precision;
  # without it, cuts snap to keyframes (fast, possibly ±1s imprecise).
  YT_ARGS+=(--download-sections "$SECTION" --force-keyframes-at-cuts)
fi

# Audio-only → extract and strip video container
if [ "$QUALITY" = "audio" ]; then
  YT_ARGS+=(--extract-audio --audio-format m4a)
fi

"$YTDLP" "${YT_ARGS[@]}" "$URL"

# yt-dlp may append extension — resolve actual produced file
if [ ! -f "$OUT_PATH" ]; then
  # Glob for anything matching the prefix
  RESOLVED=$(ls -1 "${OUT_PATH%.*}".* 2>/dev/null | head -1)
  if [ -n "$RESOLVED" ]; then OUT_PATH="$RESOLVED"; fi
fi

echo "$OUT_PATH"
