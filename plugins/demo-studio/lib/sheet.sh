#!/bin/sh
# sh sheet.sh <video> <out.jpg> <seconds...>: a contact sheet of frames at the
# given times, three per row, to check a take before anyone watches it.
set -e
video="$1"; out="$2"; shift 2
tmp=$(mktemp -d)
i=0
for t in "$@"; do
  ffmpeg -loglevel error -y -ss "$t" -i "$video" -frames:v 1 -vf "scale=1280:-2,drawtext=text='$t s':x=16:y=16:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.5" "$tmp/$(printf %03d $i).jpg"
  i=$((i + 1))
done
# Pad to a multiple of three with blank frames.
while [ $((i % 3)) -ne 0 ]; do
  ffmpeg -loglevel error -y -f lavfi -i color=c=white:s=1280x720 -frames:v 1 "$tmp/$(printf %03d $i).jpg"
  i=$((i + 1))
done
ffmpeg -loglevel error -y -pattern_type glob -i "$tmp/*.jpg" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:white,tile=3x$((i / 3))" -frames:v 1 -q:v 3 "$out"
rm -r "$tmp"
echo "$out"
