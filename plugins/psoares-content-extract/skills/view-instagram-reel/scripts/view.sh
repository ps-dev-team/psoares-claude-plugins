#!/usr/bin/env bash
# view-instagram-reel — capture raw content from an Instagram Reel.
#
# Pipeline:
#   1. metadata via yt-dlp --dump-json
#   2. download mp4
#   3. extract audio (m4a)
#   4. transcribe with OpenAI Whisper (requires OPENAI_API_KEY)
#   5. extract N evenly-spaced frames
#   6. write view.json with paths + transcript + metadata
#
# Usage:
#   view.sh <url> [--frames N] [--lang pt] [--skip-transcript] [--out <dir>]

set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "Usage: view.sh <instagram_reel_url> [--frames N] [--lang pt] [--skip-transcript] [--out <dir>]" >&2
  exit 1
fi
shift || true

FRAMES=6
WHISPER_LANG=""
SKIP_TRANSCRIPT=false
CACHE_ROOT="${PSOARES_CONTENT_CACHE:-$HOME/.cache/psoares-content-extract}"
OUT_DIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --frames) FRAMES="$2"; shift 2 ;;
    --lang) WHISPER_LANG="$2"; shift 2 ;;
    --skip-transcript) SKIP_TRANSCRIPT=true; shift ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=require.sh
source "$SCRIPT_DIR/require.sh"

require_bin yt-dlp   "brew install yt-dlp  (or: pip install --user yt-dlp)"
require_bin jq       "brew install jq"
require_bin ffmpeg   "brew install ffmpeg"
require_bin ffprobe  "brew install ffmpeg  (ffprobe ships with ffmpeg)"
require_bin bc       "brew install bc      (macOS 14+ ships this by default)"
require_bin curl     "preinstalled on macOS/Linux; check your PATH"

# shellcheck source=ratelimit.sh
source "$SCRIPT_DIR/ratelimit.sh"
# shellcheck source=ytdlp_args.sh
source "$SCRIPT_DIR/ytdlp_args.sh"

# Extract reel ID
REEL_ID=$(echo "$URL" | grep -oE '/reel/[A-Za-z0-9_-]+' | head -1 | sed 's|/reel/||')
if [ -z "$REEL_ID" ]; then
  REEL_ID=$(echo "$URL" | grep -oE '/p/[A-Za-z0-9_-]+' | head -1 | sed 's|/p/||')
fi
if [ -z "$REEL_ID" ]; then
  echo "Error: could not extract reel ID from: $URL" >&2
  exit 1
fi

if [ -z "$OUT_DIR" ]; then
  OUT_DIR="$CACHE_ROOT/instagram/$REEL_ID"
fi
mkdir -p "$OUT_DIR/frames"

METADATA_FILE="$OUT_DIR/metadata.json"
VIDEO_FILE="$OUT_DIR/${REEL_ID}.mp4"
AUDIO_FILE="$OUT_DIR/${REEL_ID}.m4a"
TRANSCRIPT_FILE="$OUT_DIR/transcript.txt"
VIEW_FILE="$OUT_DIR/view.json"

# Collect cookie args once, reuse (bash 3.2 compatible)
COOKIE_ARGS=()
while IFS= read -r line; do
  COOKIE_ARGS+=("$line")
done < <(ig_cookie_args)

# ── 1. Metadata ──────────────────────────────────────────────────────────────
ig_wait
"$YTDLP_BIN" --dump-json --no-warnings ${COOKIE_ARGS[@]+"${COOKIE_ARGS[@]}"} "$URL" > "$METADATA_FILE" 2>/dev/null

TITLE=$(jq -r '.title // ""' "$METADATA_FILE")
DESCRIPTION=$(jq -r '.description // ""' "$METADATA_FILE")
UPLOADER=$(jq -r '.uploader // .channel // ""' "$METADATA_FILE")
DURATION=$(jq -r '.duration // 0' "$METADATA_FILE")
LIKE_COUNT=$(jq -r '.like_count // 0' "$METADATA_FILE")
COMMENT_COUNT=$(jq -r '.comment_count // 0' "$METADATA_FILE")
THUMBNAIL=$(jq -r '.thumbnail // ""' "$METADATA_FILE")
UPLOAD_DATE=$(jq -r '.upload_date // ""' "$METADATA_FILE")
HASHTAGS=$( { echo "$DESCRIPTION" | grep -oE '#[A-Za-z0-9_]+' || true; } | jq -R . | jq -s .)

# ── 2. Download ──────────────────────────────────────────────────────────────
ig_wait
"$YTDLP_BIN" \
  --quiet --no-warnings \
  -f "4/best[ext=mp4]/best" \
  -o "$VIDEO_FILE" \
  ${COOKIE_ARGS[@]+"${COOKIE_ARGS[@]}"} \
  "$URL"

# ── 3. Audio ─────────────────────────────────────────────────────────────────
ffmpeg -y -i "$VIDEO_FILE" -vn -acodec copy "$AUDIO_FILE" 2>/dev/null || true

# ── 4. Transcribe ────────────────────────────────────────────────────────────
TRANSCRIPT_SOURCE=""
if [ "$SKIP_TRANSCRIPT" = false ]; then
  require_env OPENAI_API_KEY "Whisper transcription needs an OpenAI key. Pass --skip-transcript to bypass"
  LANG_ARG=()
  if [ -n "$WHISPER_LANG" ]; then
    LANG_ARG=(-F "language=$WHISPER_LANG")
  fi
  RESPONSE=$(curl -s https://api.openai.com/v1/audio/transcriptions \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -F "file=@$AUDIO_FILE" \
    -F "model=whisper-1" \
    -F "response_format=text" \
    ${LANG_ARG[@]+"${LANG_ARG[@]}"} || echo "")
  if [ -n "$RESPONSE" ]; then
    echo "$RESPONSE" > "$TRANSCRIPT_FILE"
    TRANSCRIPT_SOURCE="whisper-1"
  fi
fi

# ── 5. Frames ────────────────────────────────────────────────────────────────
DURATION_NUM=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null || echo "0")
FRAMES_JSON="[]"
if [ "$(echo "$DURATION_NUM > 0" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
  INTERVAL=$(LC_ALL=C awk -v d="$DURATION_NUM" -v n="$FRAMES" 'BEGIN { printf "%.3f", d / (n + 1) }')
  FRAME_PATHS=()
  for i in $(seq 1 "$FRAMES"); do
    TS=$(LC_ALL=C awk -v iv="$INTERVAL" -v i="$i" 'BEGIN { printf "%.3f", iv * i }')
    FRAME_PATH="$OUT_DIR/frames/frame_$(printf "%02d" "$i").jpg"
    # -ss AFTER -i = accurate seek (slower but frame-accurate; fine for short reels)
    ffmpeg -y -i "$VIDEO_FILE" -ss "$TS" -vframes 1 -q:v 2 "$FRAME_PATH" 2>/dev/null || true
    FRAME_PATHS+=("$FRAME_PATH")
  done
  FRAMES_JSON=$(printf '%s\n' "${FRAME_PATHS[@]}" | jq -R . | jq -s .)
fi

# ── 6. view.json ─────────────────────────────────────────────────────────────
TRANSCRIPT_CONTENT=""
if [ -s "$TRANSCRIPT_FILE" ]; then TRANSCRIPT_CONTENT=$(cat "$TRANSCRIPT_FILE"); fi

jq -n \
  --arg platform "instagram" \
  --arg id "$REEL_ID" \
  --arg url "$URL" \
  --arg out_dir "$OUT_DIR" \
  --arg title "$TITLE" \
  --arg description "$DESCRIPTION" \
  --arg uploader "$UPLOADER" \
  --argjson duration "${DURATION:-0}" \
  --argjson like_count "${LIKE_COUNT:-0}" \
  --argjson comment_count "${COMMENT_COUNT:-0}" \
  --arg thumbnail "$THUMBNAIL" \
  --arg upload_date "$UPLOAD_DATE" \
  --argjson hashtags "$HASHTAGS" \
  --arg video_file "$VIDEO_FILE" \
  --arg audio_file "$AUDIO_FILE" \
  --arg transcript "$TRANSCRIPT_CONTENT" \
  --arg transcript_source "$TRANSCRIPT_SOURCE" \
  --argjson frames "$FRAMES_JSON" \
  '{
    platform: $platform,
    id: $id,
    url: $url,
    out_dir: $out_dir,
    metadata: {
      title: $title,
      description: $description,
      uploader: $uploader,
      duration_seconds: $duration,
      like_count: $like_count,
      comment_count: $comment_count,
      thumbnail: $thumbnail,
      upload_date: $upload_date,
      hashtags: $hashtags
    },
    video_file: $video_file,
    audio_file: $audio_file,
    transcript: $transcript,
    transcript_source: $transcript_source,
    transcript_file: "\($out_dir)/transcript.txt",
    frames: $frames
  }' > "$VIEW_FILE"

echo "$VIEW_FILE"
