---
name: view-instagram-reel
description: >
  Capture raw content from an Instagram Reel (or regular post) so later skills
  can analyze, repurpose, or summarize it. Use when the user shares an Instagram
  URL and wants to ingest it — trigger phrases like "view this reel", "captura
  este reel", "processa este post do instagram", "vê este reel", "ingere este
  reel do instagram", or simply pastes an `instagram.com/reel/`,
  `instagram.com/p/`, `instagram.com/tv/`, or `instagram.com/stories/` URL.
  This skill is strictly CAPTURE — it does not summarize, analyze, or describe
  frame contents. Produces a structured `view.json` with metadata, video +
  audio files, Whisper transcript, and evenly-spaced frames.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# View Instagram Reel

Captures the **raw** content of an Instagram Reel — metadata, video, audio, transcript (via OpenAI Whisper), and a handful of evenly-spaced frames. It does NOT analyze, summarize, or repurpose. That's for a downstream extraction skill which reads the `view.json` this skill produces.

## Dependencies

- `yt-dlp` (PATH or `~/.local/bin/yt-dlp`)
- `ffmpeg`, `ffprobe`, `jq`, `bc`, `curl`
- `OPENAI_API_KEY` env var (for Whisper transcription — skip with `--skip-transcript` if absent)
- Instagram cookies (see below)

## How to run it

```bash
${CLAUDE_PLUGIN_ROOT}/skills/view-instagram-reel/scripts/view.sh <url> [--frames 6] [--lang pt] [--skip-transcript] [--out /custom/dir]
```

The script prints the path to `view.json` on stdout. Output layout:

```
<cache>/instagram/<reel_id>/
  metadata.json       ← raw yt-dlp dump
  <id>.mp4            ← downloaded video
  <id>.m4a            ← extracted audio
  transcript.txt      ← plain-text Whisper transcript
  frames/frame_01.jpg ← through frame_06.jpg
  view.json           ← structured summary (downstream skills read this)
```

Default cache root: `~/.cache/psoares-content-extract/`. Override with `$PSOARES_CONTENT_CACHE`.

## Instagram cookies

Instagram rate-limits and blocks unauthenticated requests hard. The script resolves cookies in this order:

1. `$IG_COOKIES_FILE` (env var)
2. `~/.config/instagram/cookies.txt` (manually-built Netscape cookies file)
3. `--cookies-from-browser $IG_BROWSER` (env override, e.g. `chrome`)
4. Auto-probe `chrome → firefox → safari → brave → edge`, pick the first where yt-dlp can load a session
5. No cookies (will almost certainly fail for reels)

### Recommended path: 4 cookies, manually copied (zero extensions, zero broad access)

On macOS, `--cookies-from-browser chrome` needs the "Chrome Safe Storage" key from the Keychain, which grants access to **all** Chrome cookies — security-conscious users will decline. The workaround is a minimal `~/.config/instagram/cookies.txt` with just the 4 cookies Instagram needs:

1. Ask the user to open `https://www.instagram.com` in their browser (must be logged in).
2. Guide them: `Cmd+Opt+I` (or `F12`) → **Application** tab → **Storage → Cookies → https://www.instagram.com`.
3. Have them paste the values of these 4 cookies (not the whole row — just the `Value` column):
   - `sessionid` (critical — HttpOnly, only visible in the DevTools Application panel)
   - `csrftoken`
   - `ds_user_id`
   - `mid`
4. Build `~/.config/instagram/cookies.txt` in **Netscape format** (tab-separated), chmod 600:

   ```
   # Netscape HTTP Cookie File
   .instagram.com	TRUE	/	TRUE	<EXPIRY_EPOCH>	sessionid	<value>
   .instagram.com	TRUE	/	TRUE	<EXPIRY_EPOCH>	csrftoken	<value>
   .instagram.com	TRUE	/	TRUE	<EXPIRY_EPOCH>	ds_user_id	<value>
   .instagram.com	TRUE	/	FALSE	<EXPIRY_EPOCH>	mid	<value>
   ```

   Use `EXPIRY_EPOCH` = `$(date -v +1y +%s)` on macOS (one year out). Note the `TRUE` = Secure flag; `mid` is not Secure in Instagram's own cookies, hence `FALSE`.

5. Re-run the script.

The session lasts until Instagram rotates the session (typically weeks to months). When it breaks, ask the user to repeat the 4-cookie copy.

### Fallback: `--cookies-from-browser`

If the user is OK granting broad browser cookie access, `IG_BROWSER=chrome|firefox|safari|brave|edge` still works and the auto-probe will find a logged-in session. This is the simplest path but trades off security.

## Rate-limit

60-second cooldown between requests, stored at `~/.cache/psoares-content-extract/instagram/last_request`. The script auto-waits. If running multiple reels in a session, expect the second one to sleep ~60s before starting.

## When to invoke this skill

Trigger as soon as the user shares an Instagram URL, unless they asked for something narrower. Your job: run the script, verify it worked, present a short recap. Do not analyze.

If the user later asks for summary/analysis/repurposing, say the view was captured and redirect them to a dedicated extraction skill (when available).

## Flow

1. **Detect the URL.** Pull the first `instagram.com/reel/`, `instagram.com/p/`, `instagram.com/tv/`, or `instagram.com/stories/` URL from the message.

2. **Run the script.** Sensible defaults:

   ```bash
   "${CLAUDE_PLUGIN_ROOT}/skills/view-instagram-reel/scripts/view.sh" "$URL"
   ```

   Pass `--lang pt` (or the user's language) if Whisper mis-detects. Pass `--skip-transcript` if `OPENAI_API_KEY` is not set and the user doesn't want to provide one.

3. **Check the result.** Read `view.json`. Expect `video_file`, `audio_file`, `transcript`, and `frames` (array of 6 jpg paths). If `transcript` is empty despite `OPENAI_API_KEY` being set, distinguish a silent reel from a Whisper failure by re-running with a simple `curl` probe to the Whisper endpoint — don't silently claim the reel was silent.

4. **Present a recap in PT-PT by default** (European Portuguese — `tu`, PT-PT spelling). If the user has been writing in another language/variant in the conversation, match them instead. One compact block:

   ```
   📱 [uploader] — [duration]s
   ❤️ [likes] · 💬 [comments]
   🏷 [hashtags joined]
   📝 Transcript: [N] chars
   🎬 Frames: [count] saved
   📁 Saved: [view.json]
   ```

5. **Stop.** Do not describe frame contents, do not summarize the transcript. That's the extraction skill's job.

## Edge cases

- **Cookies fail**: yt-dlp returns `401` / `login required`. Stop and ask the user to either (a) stay logged in on a browser, (b) set `IG_BROWSER=<name>`, or (c) export a `cookies.txt`.
- **2FA on the cookie source**: browser cookies look valid but Instagram returns a challenge. Fix is to export cookies from a fully-authenticated session into `~/.config/instagram/cookies.txt`.
- **Private account**: will fail with auth error. Surface the error; don't retry.
- **Sensitive-content warning**: requires an age-confirmed session — same fix as 2FA.
- **Carousel posts** (multiple photos/videos): yt-dlp returns the first media by default. For a specific item, pass a URL with `?img_index=N`.
- **Stories**: URLs expire after 24h. If yt-dlp says "content unavailable", tell the user.
- **No audio** (silent reel): Whisper may return empty string or garbage. Don't treat empty transcript as an error — but also don't assume silence without verifying (see flow step 3).
- **Very long reel** (>90s, rare): frame extraction still works; transcript scales linearly with Whisper cost. Expect ~30-50 MB on disk for video+frames+audio combined.
- **Cache collision**: if two reels resolve to the same short ID across different accounts, disambiguate by inspecting `metadata.json.uploader` before reusing cache.

## Caching

`view.json` is cached under `<cache>/instagram/<reel_id>/`. If the file already exists and is younger than 24h, reuse it. If older, or if the user explicitly asks to refresh, pass `--force` (not yet implemented; for now, delete the directory manually).

## What NOT to do

- Do not analyze, summarize, or "read" the transcript. Capture only.
- Do not describe what's in the frames (visual analysis belongs in the extract skill, with user-chosen model: Claude/Gemini/OpenAI).
- Do not scrape comments (metadata gives counts; actual comment text would need a separate API and is out of scope here).
- Do not reuse a stale cache blindly — if `view.json` already exists, check `mtime`; if older than 24h or `--force` was passed, re-run.
