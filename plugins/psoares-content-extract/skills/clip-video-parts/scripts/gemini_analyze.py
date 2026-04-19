#!/usr/bin/env python3
"""Send a local video file to Gemini 2.5 Flash and get a structured list of
timecoded sections (start, end, topic, visual_notes).

Usage:
    gemini_analyze.py --video <path.mp4> --out <gemini.json> [--hint "podcast, interview, ..."]

Gemini's File API is used for files larger than ~20MB (inline bytes work up to
~20MB; File API works up to 2GB per file). We upload first, wait until ACTIVE,
then pass the file reference.

Output shape:
    {
      "model": "gemini-2.5-flash",
      "raw": "<Gemini's full text response>",
      "sections": [
        {"start": "0:00", "end": "3:45", "topic": "...", "visual_notes": "..."},
        ...
      ]
    }

`sections` is parsed from the model's JSON; if parsing fails the list is empty
but `raw` is still populated so the caller can fall back to Claude-side parsing.
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash"
INLINE_LIMIT = 18 * 1024 * 1024  # 18MB — leave headroom under the ~20MB inline cap

PROMPT_TEMPLATE = """Analyze this video and identify 8-15 distinct sections or notable moments that would make good standalone clips. Aim for sections 60-300 seconds long. Favour meaningful content breaks: topic changes, notable quotes, demos, transitions.

For each section, provide:
- start_timecode: "MM:SS" or "H:MM:SS"
- end_timecode: "MM:SS" or "H:MM:SS"
- topic: one short phrase (≤10 words) describing what this section is about
- visual_notes: one short phrase describing what's visually distinctive (speaker setup, slides, b-roll, demo, etc.)

{hint_block}

Respond with ONLY a valid JSON array — no markdown fences, no prose before or after. Example:
[{{"start":"0:00","end":"2:30","topic":"Intro and hook","visual_notes":"Speaker talking to camera, branded overlay"}}]"""


def build_prompt(hint: str | None) -> str:
    hint_block = f"Context hint: {hint}\n" if hint else ""
    return PROMPT_TEMPLATE.format(hint_block=hint_block)


def parse_sections(text: str) -> list[dict]:
    """Extract the JSON array from Gemini's response, tolerating code fences."""
    if not text:
        return []
    # Strip common markdown fences
    stripped = text.strip()
    stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
    stripped = re.sub(r"\s*```$", "", stripped)
    # Find the first [ ... ] block
    match = re.search(r"\[.*\]", stripped, re.DOTALL)
    if not match:
        return []
    try:
        data = json.loads(match.group(0))
        if isinstance(data, list):
            return data
    except json.JSONDecodeError:
        return []
    return []


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--hint", default=None, help="Optional context hint to guide section selection")
    args = ap.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not set", file=sys.stderr)
        return 2

    client = genai.Client(api_key=api_key)
    video_path = Path(args.video)
    size = video_path.stat().st_size
    prompt = build_prompt(args.hint)

    if size <= INLINE_LIMIT:
        print(f"Analyzing inline ({size/1e6:.1f}MB)...", file=sys.stderr)
        video_part = types.Part.from_bytes(
            data=video_path.read_bytes(), mime_type="video/mp4"
        )
        contents = [video_part, prompt]
    else:
        print(f"Uploading via File API ({size/1e6:.1f}MB)...", file=sys.stderr)
        uploaded = client.files.upload(file=str(video_path))
        # Wait until the file is ACTIVE (Gemini pre-processes video)
        for _ in range(120):  # up to ~10 min
            f = client.files.get(name=uploaded.name)
            if f.state.name == "ACTIVE":
                break
            if f.state.name == "FAILED":
                print(f"Gemini file processing failed: {f.state.name}", file=sys.stderr)
                return 1
            time.sleep(5)
        else:
            print("Gemini file did not become ACTIVE within 10 min", file=sys.stderr)
            return 1
        contents = [f, prompt]

    resp = client.models.generate_content(model=MODEL, contents=contents)
    text = resp.text or ""
    sections = parse_sections(text)

    out = {
        "model": MODEL,
        "raw": text,
        "sections": sections,
    }
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
