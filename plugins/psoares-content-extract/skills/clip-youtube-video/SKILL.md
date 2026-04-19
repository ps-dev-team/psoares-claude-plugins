---
name: clip-youtube-video
description: >
  Download a YouTube video — either the whole thing or a specific time range —
  to a local file. Use when the user wants the actual video file, not an
  analysis. Trigger phrases: "descarrega este vídeo", "saca este youtube",
  "quero o vídeo", "download this youtube", "clip from X to Y", "saca de 1:20
  a 2:45", "baixa este vídeo", "preciso só do áudio", "extract audio". Asks
  whether to grab the full video or a range, which quality (auto / 1080p /
  720p / 480p / audio-only), and where to save.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# Clip YouTube Video

Downloads a YouTube video to disk. Either the full thing or a trimmed range (`--start` to `--end`). Uses `yt-dlp --download-sections` so partial downloads only fetch the requested segment — no "download full, then trim".

## Dependencies

- `yt-dlp` (PATH or `~/.local/bin/yt-dlp`)
- `ffmpeg` (yt-dlp shells out to it for segment extraction and audio conversion)

The script fails fast with a clear install hint if either is missing.

## How to run the script

```bash
${CLAUDE_PLUGIN_ROOT}/skills/clip-youtube-video/scripts/clip.sh <url> \
  [--start <ts>] [--end <ts>] \
  [--quality auto|1080|720|480|audio] \
  [--out <path>]
```

Timestamps use `yt-dlp` syntax: `hh:mm:ss`, `mm:ss`, or plain seconds. Omit both `--start` and `--end` to grab the full video.

Default output when `--out` is omitted:

- Full: `~/.cache/psoares-content-extract/youtube/<id>/<id>-full.<ext>`
- Partial: `~/.cache/psoares-content-extract/youtube/<id>/clips/<start>_to_<end>.<ext>`

Override the cache root with `$PSOARES_CONTENT_CACHE`.

## Flow

### 1. Detect the URL

Pull the first `youtube.com/watch`, `youtu.be/`, `youtube.com/shorts/`, or `youtube.com/embed/` URL from the user's message. If none, ask for one.

### 2. Ask: full video or a specific range?

Use `AskUserQuestion`:

```
1. Full video — default
2. Specific range — I'll give you start and end
```

If the user already said something like "saca de 1:20 a 2:45" or "full video", skip this question and the next.

### 3. Ask for start + end (only if range)

Free-form follow-up: *"Start timestamp? (e.g. 1:20 or 80)"* — same again for end. Accept `hh:mm:ss`, `mm:ss`, or seconds. You can batch these two into one question ("start/end timestamps") if it keeps the UX snappy.

**Validate**: start < end when both are numeric. Warn the user if they look inverted, don't silently swap.

### 4. Ask the quality

Use `AskUserQuestion`:

```
1. Auto (best ≤1080p) — default
2. 1080p
3. 720p
4. 480p
5. Audio only — .m4a
```

Skip this if the user said "só áudio" / "audio only" / "just the audio" — go straight to `audio`. Same if they said "highest quality" → `auto`.

### 5. Ask where to save

Use `AskUserQuestion`:

```
1. Default cache location — default
2. Custom path — specify a file or directory
```

If the user picks custom, follow up for the path. Expand `~/` and make parent directories as needed. If it's a directory, the script builds a sensible filename inside it.

### 6. Run

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/clip-youtube-video/scripts/clip.sh" "$URL" \
  [--start "$START"] \
  [--end "$END"] \
  --quality "$QUALITY" \
  [--out "$OUT_PATH"]
```

Capture stdout — it's the path to the produced file.

### 7. Confirm

One compact line (PT-PT by default, match the user's language if they've been using another):

```
✓ Guardado em: <path> (<size_human>, <quality>)
```

Get the size with `du -h` or `stat`.

## Edge cases

- **Private / age-gated / members-only**: `yt-dlp` returns an auth error. Surface it; don't retry blindly. Suggest cookies (same `cookies-from-browser` / manual cookies.txt pattern as the Instagram skill — but for YouTube you rarely need them).
- **Region-blocked**: surface and stop.
- **Live streams**: out of scope. If detected, refuse politely — clipping an in-progress stream is flaky.
- **Shorts**: work normally. For shorts you usually just want the full thing.
- **Inverted timestamps** (start > end): refuse; ask the user to swap.
- **Timestamp beyond duration**: `yt-dlp` caps at video duration; the produced clip will be shorter than requested. Flag this in the confirmation.
- **`--force-keyframes-at-cuts`**: the script enables this by default for precise cuts (±0s instead of ±1s snapping to keyframes). It re-encodes a tiny portion around each cut, so partial downloads take a bit longer than a pure stream copy. Usually worth it.
- **Audio-only on a video with no m4a track**: `yt-dlp` will transcode to m4a automatically.

## What NOT to do

- Do not run this skill when the user wants an analysis / summary / transcript. That's `extract-content` / `view-youtube-video`. This one is strictly for getting the file.
- Do not support Instagram URLs here. Instagram downloads happen inside `view-instagram-reel` (which grabs the mp4 as part of capture). Adding IG here would duplicate.
- Do not silently download the full video when the user only asked for a clip — always respect the range.
- Do not `-c copy` manually after the fact. `yt-dlp --download-sections` with `--force-keyframes-at-cuts` already handles the cut precisely.
