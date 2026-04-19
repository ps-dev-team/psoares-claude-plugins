#!/usr/bin/env python3
"""Transcribe an audio file with OpenAI Whisper, returning segments with timestamps.

Handles the 25MB Whisper API limit by chunking the audio into ~20-min segments
when needed. Segment timestamps are offset so the final JSON looks like the
audio was transcribed in one pass.

Usage:
    whisper_transcribe.py --audio <path.m4a> --out <whisper.json> [--language pt]

Output shape (matches Whisper verbose_json, merged across chunks):
    {
      "language": "pt",
      "duration": 2400.0,
      "text": "...",
      "segments": [{"id": 0, "start": 0.0, "end": 3.5, "text": "..."}, ...]
    }
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "https://api.openai.com/v1/audio/transcriptions"
MODEL = "whisper-1"
MAX_BYTES = 24 * 1024 * 1024  # 24MB — leave 1MB headroom under the 25MB limit
CHUNK_SECONDS = 20 * 60  # 20 minutes per chunk when splitting


def probe_duration(path: str) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        text=True,
    )
    return float(out.strip())


def transcribe_chunk(audio_path: str, language: str | None, api_key: str) -> dict:
    """POST a single audio file to Whisper, return parsed verbose_json."""
    boundary = "----psoares-whisper-boundary"
    body = bytearray()

    def field(name: str, value: str) -> None:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.extend(value.encode())
        body.extend(b"\r\n")

    field("model", MODEL)
    field("response_format", "verbose_json")
    if language:
        field("language", language)

    body.extend(f"--{boundary}\r\n".encode())
    body.extend(
        f'Content-Disposition: form-data; name="file"; filename="{Path(audio_path).name}"\r\n'
        f"Content-Type: audio/m4a\r\n\r\n".encode()
    )
    body.extend(Path(audio_path).read_bytes())
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(
        API_URL,
        data=bytes(body),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=600) as resp:
        return json.loads(resp.read())


def split_audio(audio_path: str, duration: float, workdir: str) -> list[tuple[str, float]]:
    """Split audio into chunks of ~CHUNK_SECONDS each. Return [(path, start_offset), ...]."""
    chunks: list[tuple[str, float]] = []
    n = 0
    start = 0.0
    while start < duration:
        out_path = Path(workdir) / f"chunk_{n:02d}.m4a"
        chunk_len = min(CHUNK_SECONDS, duration - start)
        subprocess.run(
            ["ffmpeg", "-y", "-ss", f"{start}", "-t", f"{chunk_len}",
             "-i", audio_path, "-c", "copy", str(out_path)],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        chunks.append((str(out_path), start))
        start += CHUNK_SECONDS
        n += 1
    return chunks


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--language", default=None, help="ISO-639-1 language code (pt, en, ...)")
    args = ap.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY not set", file=sys.stderr)
        return 2

    audio_path = args.audio
    size = Path(audio_path).stat().st_size
    duration = probe_duration(audio_path)

    if size <= MAX_BYTES:
        print(f"Transcribing single file ({size/1e6:.1f}MB, {duration:.0f}s)...", file=sys.stderr)
        result = transcribe_chunk(audio_path, args.language, api_key)
    else:
        print(f"Audio too large ({size/1e6:.1f}MB > 24MB). Chunking...", file=sys.stderr)
        with tempfile.TemporaryDirectory() as tmp:
            chunks = split_audio(audio_path, duration, tmp)
            merged_text_parts: list[str] = []
            merged_segments: list[dict] = []
            seg_id = 0
            language_out = args.language or ""
            for chunk_path, offset in chunks:
                print(f"  chunk at +{offset:.0f}s...", file=sys.stderr)
                r = transcribe_chunk(chunk_path, args.language, api_key)
                language_out = language_out or r.get("language", "")
                if r.get("text"):
                    merged_text_parts.append(r["text"].strip())
                for seg in r.get("segments", []):
                    merged_segments.append({
                        "id": seg_id,
                        "start": round(seg["start"] + offset, 3),
                        "end": round(seg["end"] + offset, 3),
                        "text": seg.get("text", "").strip(),
                    })
                    seg_id += 1
            result = {
                "language": language_out,
                "duration": duration,
                "text": " ".join(merged_text_parts),
                "segments": merged_segments,
            }

    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(args.out)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"OpenAI error {e.code}: {body}", file=sys.stderr)
        sys.exit(1)
