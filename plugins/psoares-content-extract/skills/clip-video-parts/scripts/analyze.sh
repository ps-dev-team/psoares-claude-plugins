#!/usr/bin/env bash
# clip-video-parts/analyze.sh — produces a "highlight map" from a local video.
#
# Pipeline:
#   1. ffprobe video: detect if it has a video stream, get duration
#   2. Extract audio, downsample to 64kbps mono m4a (keeps Whisper under 25MB
#      for ~40min; chunker in whisper_transcribe.py handles longer files)
#   3. Whisper → verbose_json with timestamped segments
#   4. If video stream exists → Gemini 2.5 Flash visual analysis (optional, can
#      be skipped with --no-gemini for pure audio sources or cost control)
#   5. Write analysis.json in the output directory — the SKILL.md consumer
#      reads whisper.json + gemini.json (when present) directly
#
# Usage:
#   analyze.sh <input-file> [--language pt] [--hint "podcast about X"] [--no-gemini] [--out <dir>]

set -euo pipefail

INPUT="${1:-}"
if [ -z "$INPUT" ]; then
  echo "Usage: analyze.sh <input-file> [--language pt] [--hint \"context\"] [--no-gemini] [--out <dir>]" >&2
  exit 1
fi
shift || true

LANGUAGE=""
HINT=""
NO_GEMINI=false
OUT_DIR=""

while [ $# -gt 0 ]; do
  case "$1" in
    --language) LANGUAGE="$2"; shift 2 ;;
    --hint) HINT="$2"; shift 2 ;;
    --no-gemini) NO_GEMINI=true; shift ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=require.sh
source "$SCRIPT_DIR/require.sh"

require_bin ffmpeg  "brew install ffmpeg"
require_bin ffprobe "brew install ffmpeg"
require_bin jq      "brew install jq"
require_bin python3 "Python 3 is required; install via brew or pyenv"

if [ ! -f "$INPUT" ]; then
  echo "Error: input file not found: $INPUT" >&2
  exit 1
fi

INPUT_ABS=$(cd "$(dirname "$INPUT")" && pwd)/$(basename "$INPUT")
BASENAME=$(basename "$INPUT_ABS")
STEM="${BASENAME%.*}"

if [ -z "$OUT_DIR" ]; then
  CACHE_ROOT="${PSOARES_CONTENT_CACHE:-$HOME/.cache/psoares-content-extract}"
  OUT_DIR="$CACHE_ROOT/parts/$STEM"
fi
mkdir -p "$OUT_DIR"

# ── 1. Probe ─────────────────────────────────────────────────────────────────
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT_ABS" 2>/dev/null || echo "0")
HAS_VIDEO=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "$INPUT_ABS" 2>/dev/null | head -1)
if [ "$HAS_VIDEO" = "video" ]; then HAS_VIDEO="true"; else HAS_VIDEO="false"; fi

echo "Duration: ${DURATION}s, has_video=$HAS_VIDEO" >&2

# ── 2. Extract + downsample audio ────────────────────────────────────────────
AUDIO_FILE="$OUT_DIR/audio-64k-mono.m4a"
if [ ! -s "$AUDIO_FILE" ]; then
  echo "Extracting audio (64kbps mono m4a)..." >&2
  ffmpeg -y -i "$INPUT_ABS" -vn -ac 1 -b:a 64k -c:a aac "$AUDIO_FILE" 2>/dev/null
fi
AUDIO_SIZE=$(stat -f%z "$AUDIO_FILE" 2>/dev/null || stat -c%s "$AUDIO_FILE" 2>/dev/null)
echo "Audio size: $(( AUDIO_SIZE / 1024 / 1024 ))MB" >&2

# ── 3. Whisper transcript ────────────────────────────────────────────────────
WHISPER_JSON="$OUT_DIR/whisper.json"
if [ ! -s "$WHISPER_JSON" ]; then
  require_env OPENAI_API_KEY "Whisper transcription (OpenAI)"
  WHISPER_ARGS=(--audio "$AUDIO_FILE" --out "$WHISPER_JSON")
  if [ -n "$LANGUAGE" ]; then WHISPER_ARGS+=(--language "$LANGUAGE"); fi
  python3 "$SCRIPT_DIR/whisper_transcribe.py" "${WHISPER_ARGS[@]}" >&2
else
  echo "Reusing cached $WHISPER_JSON" >&2
fi

SEGMENT_COUNT=$(jq '.segments | length' "$WHISPER_JSON")
echo "Whisper: $SEGMENT_COUNT segments" >&2

# ── 4. Gemini visual analysis (if video and not skipped) ─────────────────────
GEMINI_JSON="$OUT_DIR/gemini.json"
if [ "$HAS_VIDEO" = "true" ] && [ "$NO_GEMINI" = false ]; then
  if [ ! -s "$GEMINI_JSON" ]; then
    require_env GEMINI_API_KEY "Gemini visual analysis"
    GEMINI_ARGS=(--video "$INPUT_ABS" --out "$GEMINI_JSON")
    if [ -n "$HINT" ]; then GEMINI_ARGS+=(--hint "$HINT"); fi
    python3 "$SCRIPT_DIR/gemini_analyze.py" "${GEMINI_ARGS[@]}" >&2
  else
    echo "Reusing cached $GEMINI_JSON" >&2
  fi
  SECTION_COUNT=$(jq '.sections | length' "$GEMINI_JSON" 2>/dev/null || echo 0)
  echo "Gemini: $SECTION_COUNT sections" >&2
fi

# ── 5. Write analysis.json summary ──────────────────────────────────────────
ANALYSIS_JSON="$OUT_DIR/analysis.json"
jq -n \
  --arg input "$INPUT_ABS" \
  --argjson duration "${DURATION:-0}" \
  --argjson has_video "$([ "$HAS_VIDEO" = "true" ] && echo true || echo false)" \
  --arg out_dir "$OUT_DIR" \
  --arg whisper_json "$WHISPER_JSON" \
  --arg gemini_json "$([ -s "$GEMINI_JSON" ] && echo "$GEMINI_JSON" || echo "")" \
  '{
    input: $input,
    out_dir: $out_dir,
    duration_seconds: $duration,
    has_video: $has_video,
    whisper_json: $whisper_json,
    gemini_json: (if $gemini_json == "" then null else $gemini_json end)
  }' > "$ANALYSIS_JSON"

echo "$ANALYSIS_JSON"
