#!/usr/bin/env bash
# view-youtube-video — capture raw content from a YouTube URL.
#
# Pipeline:
#   1. yt-dlp --dump-json  → metadata
#   2. yt-dlp --write-auto-sub --skip-download → captions (VTT → plain text)
#   3. If no captions AND --gemini-fallback: call Gemini for transcript
#   4. Write view.json + transcript.txt to cache dir
#
# Usage:
#   view.sh <url> [--gemini-fallback] [--lang <code>] [--out <dir>]

set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "Usage: view.sh <youtube_url> [--gemini-fallback] [--lang <code>] [--out <dir>]" >&2
  exit 1
fi
shift || true

GEMINI_FALLBACK=false
LANG_CODE="pt-PT,pt,en"
CACHE_ROOT="${PSOARES_CONTENT_CACHE:-$HOME/.cache/psoares-content-extract}"
OUT_DIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --gemini-fallback) GEMINI_FALLBACK=true; shift ;;
    --lang) LANG_CODE="$2"; shift 2 ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=require.sh
source "$SCRIPT_DIR/require.sh"

require_bin yt-dlp "brew install yt-dlp  (or: pip install --user yt-dlp)"
require_bin jq     "brew install jq"

YTDLP="${YTDLP_BIN:-yt-dlp}"
if ! command -v "$YTDLP" >/dev/null 2>&1 && [ -x "$HOME/.local/bin/yt-dlp" ]; then
  YTDLP="$HOME/.local/bin/yt-dlp"
fi

# Extract video ID (11 char YouTube ID)
VIDEO_ID=$(echo "$URL" | grep -oE '[A-Za-z0-9_-]{11}' | head -1)
if [ -z "$VIDEO_ID" ]; then
  echo "Error: could not extract video ID from: $URL" >&2
  exit 1
fi

if [ -z "$OUT_DIR" ]; then
  OUT_DIR="$CACHE_ROOT/youtube/$VIDEO_ID"
fi
mkdir -p "$OUT_DIR"

METADATA_FILE="$OUT_DIR/metadata.json"
TRANSCRIPT_FILE="$OUT_DIR/transcript.txt"
VIEW_FILE="$OUT_DIR/view.json"

# ── 1. Metadata ──────────────────────────────────────────────────────────────
"$YTDLP" --dump-json --no-warnings "$URL" > "$METADATA_FILE" 2>/dev/null

TITLE=$(jq -r '.title // ""' "$METADATA_FILE")
CHANNEL=$(jq -r '.channel // .uploader // ""' "$METADATA_FILE")
DURATION=$(jq -r '.duration // 0' "$METADATA_FILE")
DESCRIPTION=$(jq -r '.description // ""' "$METADATA_FILE")
THUMBNAIL=$(jq -r '.thumbnail // ""' "$METADATA_FILE")
VIEW_COUNT=$(jq -r '.view_count // 0' "$METADATA_FILE")
LIKE_COUNT=$(jq -r '.like_count // 0' "$METADATA_FILE")
UPLOAD_DATE=$(jq -r '.upload_date // ""' "$METADATA_FILE")

# ── 2. Captions (auto-subs preferred, then manual subs) ──────────────────────
SUB_DIR="$OUT_DIR/subs"
mkdir -p "$SUB_DIR"
TRANSCRIPT_SOURCE=""

"$YTDLP" \
  --skip-download \
  --write-auto-sub \
  --write-sub \
  --sub-lang "$LANG_CODE" \
  --sub-format vtt \
  --no-warnings \
  -o "$SUB_DIR/%(id)s.%(ext)s" \
  "$URL" >/dev/null 2>&1 || true

SUB_FILE=$(find "$SUB_DIR" -name "*.vtt" -type f | head -1)

if [ -n "$SUB_FILE" ] && [ -s "$SUB_FILE" ]; then
  # Strip VTT timestamps/cue blocks → plain text, collapse repeats
  awk '
    /^WEBVTT/ {next}
    /^[0-9]+$/ {next}
    /-->/ {next}
    /^$/ {next}
    {gsub(/<[^>]*>/, ""); gsub(/&nbsp;/, " "); print}
  ' "$SUB_FILE" | awk '!seen[$0]++' > "$TRANSCRIPT_FILE"
  TRANSCRIPT_SOURCE="yt-dlp-captions"
fi

# ── 3. Gemini fallback ───────────────────────────────────────────────────────
if [ ! -s "$TRANSCRIPT_FILE" ] && [ "$GEMINI_FALLBACK" = true ]; then
  require_env GEMINI_API_KEY "--gemini-fallback calls the Gemini API"
  python3 "$SCRIPT_DIR/gemini_transcript.py" "$URL" > "$TRANSCRIPT_FILE" 2>/dev/null || true
  if [ -s "$TRANSCRIPT_FILE" ]; then
    TRANSCRIPT_SOURCE="gemini-2.5-flash"
  fi
fi

# ── 4. view.json ─────────────────────────────────────────────────────────────
TRANSCRIPT_CONTENT=""
if [ -s "$TRANSCRIPT_FILE" ]; then
  TRANSCRIPT_CONTENT=$(cat "$TRANSCRIPT_FILE")
fi

jq -n \
  --arg platform "youtube" \
  --arg id "$VIDEO_ID" \
  --arg url "$URL" \
  --arg title "$TITLE" \
  --arg channel "$CHANNEL" \
  --argjson duration "${DURATION:-0}" \
  --arg description "$DESCRIPTION" \
  --arg thumbnail "$THUMBNAIL" \
  --argjson view_count "${VIEW_COUNT:-0}" \
  --argjson like_count "${LIKE_COUNT:-0}" \
  --arg upload_date "$UPLOAD_DATE" \
  --arg transcript "$TRANSCRIPT_CONTENT" \
  --arg transcript_source "$TRANSCRIPT_SOURCE" \
  --arg out_dir "$OUT_DIR" \
  '{
    platform: $platform,
    id: $id,
    url: $url,
    out_dir: $out_dir,
    metadata: {
      title: $title,
      channel: $channel,
      duration_seconds: $duration,
      description: $description,
      thumbnail: $thumbnail,
      view_count: $view_count,
      like_count: $like_count,
      upload_date: $upload_date
    },
    transcript: $transcript,
    transcript_source: $transcript_source,
    transcript_file: "\($out_dir)/transcript.txt",
    metadata_file: "\($out_dir)/metadata.json"
  }' > "$VIEW_FILE"

echo "$VIEW_FILE"
