#!/usr/bin/env python3
"""Fallback: fetch a raw transcript from Gemini 2.5 Flash given a YouTube URL.

Used only when yt-dlp returns no captions. Prints plain text to stdout.
"""

import os
import re
import sys

from google import genai
from google.genai import types

MODEL = "gemini-2.5-flash"
PROMPT = (
    "Transcribe all spoken content in this video as plain text. "
    "Do not add speaker labels, timestamps, or commentary. "
    "Preserve the original language."
)


def extract_video_id(url: str) -> str:
    patterns = [
        r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})",
        r"youtube\.com/shorts/([a-zA-Z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return url


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: gemini_transcript.py <youtube_url>", file=sys.stderr)
        return 2

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("GEMINI_API_KEY not set", file=sys.stderr)
        return 2

    video_id = extract_video_id(sys.argv[1])
    url = f"https://www.youtube.com/watch?v={video_id}"

    client = genai.Client(api_key=key)
    resp = client.models.generate_content(
        model=MODEL,
        contents=[
            types.Part.from_uri(file_uri=url, mime_type="video/*"),
            PROMPT,
        ],
    )
    sys.stdout.write(resp.text or "")
    return 0


if __name__ == "__main__":
    sys.exit(main())
