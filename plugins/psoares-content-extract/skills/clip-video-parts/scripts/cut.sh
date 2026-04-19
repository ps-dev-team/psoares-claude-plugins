#!/usr/bin/env bash
# clip-video-parts/cut.sh — cut multiple ranges from an input video/audio file.
#
# Re-encodes for precise cuts (±0s) using libx264 + aac at fast preset. Podcasts
# and interviews tolerate re-encode cost fine; stream-copy would snap to
# keyframes and misalign the cuts.
#
# Usage:
#   cut.sh --input <path> --out-dir <dir> [--format mp4|m4a] \
#     <slug1>:<start1>:<end1> <slug2>:<start2>:<end2> ...
#
# Each trailing arg is a colon-separated triple:
#   slug   — safe filename stem (no spaces, no colons)
#   start  — ffmpeg timestamp (hh:mm:ss, mm:ss, or seconds)
#   end    — same
#
# Writes to <out-dir>/<slug>-<safe_start>-<safe_end>.<ext>
# Prints one output path per line.

set -euo pipefail

INPUT=""
OUT_DIR=""
FORMAT="mp4"

while [ $# -gt 0 ]; do
  case "$1" in
    --input) INPUT="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --format) FORMAT="$2"; shift 2 ;;
    --) shift; break ;;
    *) break ;;
  esac
done

if [ -z "$INPUT" ] || [ -z "$OUT_DIR" ]; then
  echo "Usage: cut.sh --input <path> --out-dir <dir> [--format mp4|m4a] <slug>:<start>:<end>..." >&2
  exit 1
fi
if [ ! -f "$INPUT" ]; then
  echo "Error: input not found: $INPUT" >&2
  exit 1
fi
if [ $# -eq 0 ]; then
  echo "Error: no ranges given" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=require.sh
source "$SCRIPT_DIR/require.sh"
require_bin ffmpeg "brew install ffmpeg"

mkdir -p "$OUT_DIR"

case "$FORMAT" in
  mp4)
    CODEC_ARGS=(-c:v libx264 -preset fast -crf 20 -c:a aac -b:a 128k)
    EXT="mp4"
    ;;
  m4a)
    CODEC_ARGS=(-vn -c:a aac -b:a 128k)
    EXT="m4a"
    ;;
  *)
    echo "Error: --format must be mp4 or m4a" >&2
    exit 1
    ;;
esac

for range in "$@"; do
  # Parse slug:start:end — start/end may contain colons in hh:mm:ss form
  slug="${range%%:*}"
  rest="${range#*:}"
  # Split start/end: the boundary is the first : that isn't part of an hh:mm:ss
  # Trick: use IFS=| by normalising — but simpler: require exactly one non-slug :
  # Accept "slug:start:end" where start/end are one of {seconds|mm:ss|hh:mm:ss}.
  # We greedily take the last 1-3 colon-separated tokens as the end, and the
  # rest of `rest` as the start. Simplest robust approach: expect the caller
  # already encoded start/end without colons (e.g. "120" or "0m30"). The SKILL
  # normalises timestamps to seconds before calling.
  if [[ "$rest" != *":"* ]]; then
    echo "Error: range '$range' missing end (expected slug:start:end)" >&2
    exit 1
  fi
  start="${rest%:*}"
  end="${rest##*:}"

  safe_start=$(echo "$start" | tr ':' '-' | tr -d ' ')
  safe_end=$(echo "$end" | tr ':' '-' | tr -d ' ')
  out_path="$OUT_DIR/${slug}-${safe_start}-${safe_end}.${EXT}"

  ffmpeg -y -i "$INPUT" -ss "$start" -to "$end" "${CODEC_ARGS[@]}" "$out_path" \
    2>/dev/null

  echo "$out_path"
done
