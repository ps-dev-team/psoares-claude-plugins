---
name: view-youtube-video
description: >
  Capture raw content from a YouTube video so later skills (extraction, analysis,
  repurposing) can work on it. Use when the user shares a YouTube URL and wants
  to ingest it — trigger phrases like "view this video", "ingere este vídeo",
  "vê este vídeo do youtube", "vê este short do youtube", "captura este
  youtube", "processa este link", or simply pastes a `youtube.com/watch`,
  `youtu.be/`, or `youtube.com/shorts/` URL. This skill is strictly CAPTURE —
  it does not summarize, analyze, or repurpose. Produces a structured
  `view.json` with metadata, thumbnail, and full transcript (from YouTube
  auto-captions, or optionally Gemini 2.5 Flash as fallback).
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# View YouTube Video

This skill captures the **raw** content of a YouTube video — metadata, transcript, thumbnail. It does **not** analyze, summarize, or repurpose. Leave that to a downstream extraction skill which reads the `view.json` file produced here.

## Dependencies

- `yt-dlp` (installed at `~/.local/bin/yt-dlp` if not on PATH)
- `jq`
- `python3` with `google-genai` (only if using `--gemini-fallback`)
- `GEMINI_API_KEY` env var (only for fallback)

## How to run it

```bash
${CLAUDE_PLUGIN_ROOT}/skills/view-youtube-video/scripts/view.sh <url> [--gemini-fallback] [--lang pt,en] [--out /custom/dir]
```

The script prints the path to `view.json` on stdout. It writes everything under `~/.cache/psoares-content-extract/youtube/<video_id>/`:

```
metadata.json     ← raw yt-dlp dump
transcript.txt    ← plain-text transcript (one line per caption chunk, dedup'd)
subs/             ← original VTT files
view.json         ← structured summary (what downstream skills read)
```

## When to invoke this skill

Trigger this as soon as the user shares a YouTube URL, unless they've explicitly asked for something else (e.g. just the thumbnail, just download, etc.). The user said they want to "view" the content as a prep step — so your job is: run the script, confirm it worked, and present a short human-readable recap.

Do NOT produce a summary, analysis, or repurposing output in this skill. That's for a separate extraction skill. If the user asks for analysis, say the view was captured and suggest they invoke the extract skill next.

## Flow

1. **Detect the URL.** Pull the first `youtube.com/watch`, `youtu.be/`, `youtube.com/shorts/`, or `youtube.com/embed/` URL from the user message.

2. **Run the script.** Default args are fine for most videos:

   ```bash
   "${CLAUDE_PLUGIN_ROOT}/skills/view-youtube-video/scripts/view.sh" "$URL"
   ```

   Capture stdout — it's the path to `view.json`, which you read in step 3.

   If the user explicitly mentions a transcript is missing or low quality, re-run with `--gemini-fallback` (requires `GEMINI_API_KEY`).

   If the user's language is not PT/EN, pass `--lang` (e.g. `--lang es,fr,en`). The default `pt-PT,pt,en` prefers Portuguese (Portugal) captions, then the generic `pt` track (often PT-BR on YouTube), then English — if none are present, the transcript will be empty even when captions in another language exist.

3. **Check the result.** Read `view.json`. If `transcript` is empty AND you did not use `--gemini-fallback`, tell the user and offer to retry with the fallback.

4. **Present a recap in PT-PT by default** (European Portuguese — `tu`, PT-PT spelling). If the user has been writing in another language/variant in the conversation, match them instead. One short block, nothing more. Example:

   ```
   📺 [Title] — @[channel] · [duration]
   ▶ [view_count] views · 👍 [like_count]
   📝 Transcript: [N] chars ([source])
   📁 Saved: [view.json path]
   ```

5. **Stop.** Do not analyze or summarize. If the user wants that, they'll ask for extraction.

## Edge cases

- **Private / age-gated / members-only videos**: yt-dlp fails with an auth error. Surface the error to the user; do not retry blindly. Members-only content needs cookies from a logged-in session — out of scope for this skill.
- **Region-blocked** (`Video unavailable in your country`): surface and stop.
- **Deleted / unlisted-revoked**: yt-dlp returns 404. Report clearly.
- **Shorts**: the script handles them the same way. Transcript may be absent for very short clips — offer `--gemini-fallback`.
- **Live streams**: refuse politely — live content is out of scope.
- **URL with playlist / timestamp params** (`&list=...`, `&t=42`): the script ignores them (matches only the video ID).
- **No captions available**: `transcript` will be empty. Offer `--gemini-fallback`; if user declines, note that downstream analysis will be thinner.
- **Caption language mismatch** (video is PT but only EN captions exist): the default `--lang pt,en` falls back correctly. For other languages, pass `--lang xx,en` to include English as a safety net.

## What NOT to do

- Do not `curl` the URL directly — always go through yt-dlp.
- Do not download the video file (YouTube videos can be large; we only need captions + metadata).
- Do not call Gemini unless the user explicitly asked for fallback or the default path produced no transcript AND you asked permission first.
- Do not write a summary, analysis, or "key points" section. This skill is strictly capture.
