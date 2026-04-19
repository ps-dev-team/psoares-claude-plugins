---
name: clip-video-parts
description: >
  Analyze a long video or podcast (local file or YouTube URL), brainstorm with
  the user which parts are worth extracting, and cut multiple clips in one
  pass. Use when the user has a 30-min+ recording and wants several standalone
  clips — not just one range. Trigger phrases: "saca partes deste vídeo",
  "divide este podcast em clips", "extrai os melhores momentos", "quero
  highlights deste vídeo", "clip the best parts", "break this podcast into
  segments", "faz recortes deste curso", "extract multiple clips". Uses
  OpenAI Whisper for timestamped transcript and Gemini 2.5 Flash for visual
  analysis, then presents candidate sections for the user to pick from
  conversationally.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# Clip Video Parts

Takes a long video (podcast, course, interview, keynote) and helps the user extract **several** standalone clips through a conversational brainstorm. Unlike `clip-youtube-video` (which cuts one known range), this skill first **analyses** the source to propose candidate sections, then iterates with the user before cutting.

## Dependencies

- `ffmpeg`, `ffprobe`, `jq`
- `python3` with `google-genai` (for Gemini visual analysis — only if the source has video)
- `OPENAI_API_KEY` — Whisper transcript with timestamps
- `GEMINI_API_KEY` — Gemini visual analysis (skip with `--no-gemini` for audio-only sources)
- `yt-dlp` (only if the input is a YouTube URL — chains `clip-youtube-video`)

## Input

**The skill always operates on a local file.** If the user gives a YouTube URL, chain `clip-youtube-video` first to download the full video (default quality), then pass the resulting path into this skill's pipeline. This keeps the skill platform-agnostic: course platforms, Loom, Descript exports, recordings, anything that ends up as an mp4/mp3/m4a works.

Supported inputs (post-chain): `.mp4`, `.mov`, `.mkv`, `.m4a`, `.mp3`, `.wav`. ffprobe decides whether there's a video stream — if not, Gemini is skipped automatically.

## Flow

### 1. Resolve the input to a local file

- If the message contains a YouTube URL:
  1. Invoke `clip-youtube-video` with the URL, full video, quality `auto`, save to the default cache location.
  2. Capture the output path.
  3. Confirm with the user: *"Downloaded {size}. Continue with analysis?"* (so they know the first API cost already happened before committing to Whisper + Gemini).
- If the message contains a local path: expand `~/`, verify the file exists.
- If nothing clear: ask the user for either a URL or a path.

### 2. Ask for optional context (skippable, high-leverage)

Use `AskUserQuestion`:

```
Queres dar contexto sobre este vídeo (tipo de conteúdo, foco desejado)?
1. Skip — default
2. Yes, let me type it
```

If **Yes**, free-form follow-up: *"Em 1-2 linhas: que tipo de conteúdo é, e em que tipo de clips estás interessado?"* (e.g. *"Podcast sobre Claude Code, quero momentos que funcionem como teasers para redes"*, *"Curso sobre n8n, quero as demos práticas separadas"*).

Pass this as `--hint` to the Gemini analysis. It materially changes which sections get proposed.

### 3. Run the analysis pipeline

```bash
ANALYSIS=$("${CLAUDE_PLUGIN_ROOT}/skills/clip-video-parts/scripts/analyze.sh" "$INPUT" [--hint "$HINT"] [--language pt])
```

This writes `whisper.json` (always) + `gemini.json` (when the file has a video stream) + `analysis.json` (top-level manifest) under `~/.cache/psoares-content-extract/parts/<stem>/`.

For 40-min podcasts expect ~3-5 min total: Whisper dominates (~2x real-time), Gemini takes 30-60s on a 40-min video.

If the file is audio-only (no video stream), skip Gemini automatically — the script handles this via the `--no-gemini` / auto-detect branch. For audio-only sources the brainstorm uses Whisper segments only.

### 4. Present candidates (brainstorm phase)

Read `analysis.json`:

- If `gemini_json` is not null, Read it — `sections[]` is the primary candidate list.
- Always also Read `whisper_json` — use its `segments[]` to enrich each candidate with a transcript excerpt (roughly the first 2-3 lines of text falling in that range).
- If Gemini is absent (audio-only or Gemini failed), generate candidates yourself by reading the Whisper segments: cluster contiguous segments into ~5-10 chunks of 60-300s each, break at clear topic shifts or long pauses, and give each a short topic label based on the transcript content.

Present to the user in a compact table. Keep it scannable:

```
Candidates found ({N}, total duration {D}):

 # | Range      | Dur  | Topic
 ---|------------|------|----------------------------------------
 1  | 0:00–2:45  | 2:45 | Intro + "why this matters" hook
 2  | 2:45–6:10  | 3:25 | [visual: whiteboard] Core framework explained
 ...
```

Ask the user:

```
Quais queres recortar? Podes:
- Indicar números (ex: "1, 3 e 7")
- Ajustar bounds (ex: "3 mas começa em 5:40")
- Juntar consecutivos (ex: "funde 4 e 5")
- Pedir mais detalhe em alguma (ex: "mostra-me o transcript da 6")
```

### 5. Iterate until the user commits

Handle the user's responses conversationally:

- **Selection**: build a final list of `{slug, start, end}` triples. `slug` is a kebab-case distillation of the topic (max ~40 chars, ASCII only); use the candidate number as a fallback (`clip-03`).
- **Bound adjustment**: update `start`/`end` as given. Validate `start < end`.
- **Merge**: `{slug: combined-slug, start: min_start, end: max_end}`.
- **Deeper inspection**: Read the relevant Whisper segments and show the requested transcript snippet. Then re-ask.

When the user clearly commits ("sim, corta isso", "vamos com essa lista", "force", "go"), proceed. If they're vague, echo the final list and ask for explicit confirmation.

### 6. Ask output format and destination

Use `AskUserQuestion`:

```
Que formato queres para os clips?
1. Video (mp4) — default
2. Audio-only (m4a)
```

If the source is audio-only, skip this and force `m4a`.

```
Onde guardar?
1. Default — <analysis_out_dir>/clips/
2. Custom path (directory)
```

If custom, follow up for the directory.

### 7. Cut

Normalise timestamps to seconds before calling `cut.sh` (the script expects `slug:start:end` with start/end as plain numbers OR ffmpeg-compatible strings without embedded colons for the slug parser to work cleanly):

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/clip-video-parts/scripts/cut.sh" \
  --input "$INPUT" \
  --out-dir "$OUT_DIR" \
  --format "$FORMAT" \
  "intro-and-hook:0:165" \
  "core-framework:165:370" \
  "demo-of-X:610:780"
```

Stdout is one path per clip, in the same order as the ranges given.

### 8. Present the final list

Compact summary in PT-PT by default (match the user's language if they've been using another):

```
✓ {N} clips guardados em {OUT_DIR}:

 • intro-and-hook-0-165.mp4 ({size}, 0:00–2:45)
 • core-framework-165-370.mp4 ({size}, 2:45–6:10)
 • demo-of-X-610-780.mp4 ({size}, 10:10–13:00)
```

## Edge cases

- **Very long input** (>1h): Whisper script chunks automatically (~20-min chunks, timestamps offset). Gemini may refuse or be slow — if it fails, fall back to Whisper-only candidate generation.
- **Non-speech segments** (music, silence, intros): Whisper skips silence but may emit garbage on music. If a candidate's transcript_excerpt looks non-speech, flag it in the brainstorm table ("[music]") rather than pretending there's content.
- **Gemini returns invalid JSON**: `gemini.json.sections` will be empty but `raw` is preserved. Fall through to Whisper-only candidate generation and mention to the user that the visual layer failed so they know what they're working with.
- **User picks a range beyond duration**: validate against `analysis.json.duration_seconds`; cap `end` silently and note it in the summary.
- **Slug collisions** (two clips with the same slug): append `-2`, `-3` etc. Don't silently overwrite.
- **Re-running on the same source**: the analysis stage caches `whisper.json` and `gemini.json` (re-uses them if present and non-empty). Only the cutting re-runs. Useful for iteration.
- **User aborts mid-brainstorm**: nothing is cut; the analysis files stay in the cache for the next attempt.

## What NOT to do

- Do not run this skill for single-clip extractions. That's `clip-youtube-video`. This skill's value is the brainstorm + multi-clip batch — using it for one clip wastes Whisper + Gemini calls.
- Do not propose candidates without running the analysis first. Don't ever invent timecodes from the URL alone.
- Do not silently cut when the user's selection is ambiguous. Always reflect the final list and get explicit confirmation.
- Do not delete the cached `whisper.json` / `gemini.json` after cutting — they're cheap to keep and valuable for re-runs.
- Do not leak `OPENAI_API_KEY` or `GEMINI_API_KEY` in any saved file or chat output.
