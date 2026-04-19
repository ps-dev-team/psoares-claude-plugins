# psoares-content-extract

Capture raw content from social media videos — metadata, transcript, frames — so Claude can analyze, summarize, or repurpose it afterwards. Clean separation between **view** skills (ingest) and a future **extract** skill (analyze).

## Install

```
/plugin marketplace add psoares/psoares-claude-plugins
/plugin install psoares-content-extract@psoares-claude-plugins
```

## Skills

### `view-youtube-video`

Feeds on a YouTube URL and produces:

- Metadata (title, channel, duration, view/like counts, upload date, thumbnail)
- Full transcript (from YouTube auto-captions; optional Gemini 2.5 Flash fallback if no captions)
- Structured `view.json` at `~/.cache/psoares-content-extract/youtube/<id>/`

Just paste any `youtube.com/watch`, `youtu.be/`, or `youtube.com/shorts/` URL. For videos without captions, re-run with `--gemini-fallback` (requires `GEMINI_API_KEY`).

### `view-instagram-reel`

Feeds on an Instagram Reel (or post) URL and produces:

- Metadata (uploader, likes, comments, hashtags, thumbnail)
- Downloaded video + extracted audio
- Transcript via OpenAI Whisper (`OPENAI_API_KEY` required — or `--skip-transcript`)
- 6 evenly-spaced frames as JPEGs
- Structured `view.json` at `~/.cache/psoares-content-extract/instagram/<id>/`

Accepts `instagram.com/reel/`, `instagram.com/p/`, and `instagram.com/stories/` URLs.

### `clip-youtube-video`

Downloads a YouTube video to disk — the full thing or a trimmed range. Uses `yt-dlp --download-sections` so partial downloads only fetch the requested segment. Interactive flow asks full-vs-range, quality (auto / 1080p / 720p / 480p / audio-only), and save destination.

Trigger phrases: *"descarrega este vídeo"*, *"saca de 1:20 a 2:45"*, *"só o áudio deste youtube"*.

### `clip-video-parts`

Multi-clip extractor for long videos (podcasts, courses, interviews). Takes a local file (or a YouTube URL — chains `clip-youtube-video` to download first), runs OpenAI Whisper for timestamped transcript and Gemini 2.5 Flash for visual analysis, then presents 8-15 candidate sections and brainstorms with the user which ones to cut. Exports each as a separate clip.

Trigger phrases: *"saca partes deste vídeo"*, *"divide este podcast em clips"*, *"extrai os melhores momentos"*, *"quero highlights deste vídeo"*.

## Dependencies

These are **binary dependencies** — Claude Code plugins don't have a built-in install system, so you install them once on your machine. Each skill's `view.sh` checks them on startup and exits with a clear install hint if anything is missing.

| Tool | Needed by | Install |
|---|---|---|
| `yt-dlp` | both | `brew install yt-dlp` or `pip install --user yt-dlp` |
| `jq` | both | `brew install jq` |
| `ffmpeg` / `ffprobe` | instagram | `brew install ffmpeg` |
| `bc`, `curl` | instagram | preinstalled on macOS/Linux |
| `google-genai` (python) | youtube fallback only | `pip install google-genai` |

## Environment variables

The recommended place to set these is the **`env` block of your user-level `settings.json`** (usually `~/.claude/settings.json`). Claude Code injects everything in that block into every session, so the keys are available to any plugin script.

```json
{
  "env": {
    "OPENAI_API_KEY": "sk-...",
    "GEMINI_API_KEY": "..."
  }
}
```

Alternatively, export the keys from your shell profile (`~/.zshrc`, `~/.bashrc`) — but the `settings.json` path keeps them scoped to Claude Code.

| Var | Purpose | Required? |
|---|---|---|
| `OPENAI_API_KEY` | Whisper transcription for Instagram | needed for IG unless `--skip-transcript` |
| `GEMINI_API_KEY` | fallback transcript for YouTube | only with `--gemini-fallback` |
| `IG_COOKIES_FILE` | path to exported Instagram cookies.txt | optional override |
| `IG_BROWSER` | browser for `--cookies-from-browser` (chrome, firefox, safari, brave, edge) | optional override |
| `PSOARES_CONTENT_CACHE` | cache root (default `~/.cache/psoares-content-extract`) | optional |

Each view script fails fast with a helpful error pointing at `settings.json` if a required key is missing.

## Instagram cookies

Instagram blocks unauthenticated requests. Two ways to authenticate:

**A) Four manually-copied cookies (recommended — no extensions, no broad browser access):**

1. Open `https://www.instagram.com` in your browser (logged in).
2. `Cmd+Opt+I` → **Application** tab → **Cookies** → `https://www.instagram.com`.
3. Copy the values of `sessionid`, `csrftoken`, `ds_user_id`, `mid`.
4. Build `~/.config/instagram/cookies.txt` in Netscape format (ask the skill to do this for you).

Security-wise this only exposes the specific 4 cookies needed for authentication.

**B) `--cookies-from-browser` (easier but broad):**

Set `IG_BROWSER=chrome|firefox|safari|brave|edge` and yt-dlp reads the session from the browser's cookie store. On macOS with Chrome, expect a Keychain prompt granting access to **all** Chrome cookies (all-or-nothing). Skip this path if that's not acceptable.

The skill tries these in order: `$IG_COOKIES_FILE` → `~/.config/instagram/cookies.txt` → `IG_BROWSER` → auto-probe installed browsers.

## Rate-limit

The Instagram skill enforces a 60-second cooldown between requests (stored in the cache dir) to avoid temporary blocks. The script auto-waits.

## `extract-content` skill

Reads a `view.json` and produces an analysis. Always uses the current Claude session (no external API) — any model choice for transcription lives in the view skills, not here.

Interactive flow: analysis type (Notes & Summary / Quick / Deep Dive / Action Items / Repurpose / Transcript / Other) → optional extra context → optional tone and length → output language (PT-PT default) → save destination. Handles PT-PT-specific defaults consistently.

Trigger it with phrases like `"analisa este vídeo"`, `"resume este reel"`, `"dá-me os action items"`, `"extract key points"`, `"repurpose this video"`.
