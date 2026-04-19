---
name: extract-content
description: >
  Analyze a captured social-media video (YouTube or Instagram) and extract
  insights — summaries, action items, deep dives, repurposing ideas, or full
  transcript. Use when the user asks to analyze, summarize, break down, or
  extract value from a video that has already been ingested by the view skills,
  OR when the user pastes a URL and asks for analysis (chain: view first, then
  extract). Trigger phrases: "analisa este vídeo", "resume este reel", "dá-me
  os action items", "extract key points", "repurpose this video", "analyze
  this youtube", "summarize the reel", "breakdown this content", "pontos-chave
  do vídeo", "ideias para reutilizar", "dá-me o transcript". The analysis is
  always done by the current Claude session (no external API). Asks the user
  for analysis type, optional context/tone/length, output language, and save
  destination.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# Extract Content

Takes a raw `view.json` (produced by `view-youtube-video` or `view-instagram-reel`) and generates an analysis: summary, deep dive, action items, repurpose ideas, or straight transcript. The analysis is always done by **the current Claude session** — no external API, no extra cost, full conversation context.

This skill is **complementary** to the view skills — it does NOT re-fetch, re-transcribe, or re-download anything. It reasons over the captured content (transcript + frames, when applicable) that the view skill produced. Any model choice for transcription lives in the view skills, not here.

## Dependencies

- `jq` (to read `view.json`)

That's it — the Claude session does the analytical work by reading the cached transcript (and frames, for Instagram) with the `Read` tool.

## Flow

### 1. Locate the `view.json`

The user may give you:

- **A path** to a `view.json`. Use it directly.
- **A URL** (youtube.com, youtu.be, instagram.com/reel, …). Derive the expected cache path:
  - YouTube: `~/.cache/psoares-content-extract/youtube/<video_id>/view.json`
  - Instagram: `~/.cache/psoares-content-extract/instagram/<reel_id>/view.json`
  - Override with `$PSOARES_CONTENT_CACHE` if set.
- **Nothing specific** (just "analisa o último que corri"). Check the newest `view.json` under the cache root (`find ~/.cache/psoares-content-extract -name view.json -type f | xargs ls -t | head -1`).

If the `view.json` doesn't exist yet AND the user gave a URL, invoke the matching view skill first (`view-youtube-video` or `view-instagram-reel`) before proceeding. Confirm with the user before running the view step, so they can opt into any extra cost (Whisper, Gemini fallback, etc.).

### 2. Ask what kind of analysis

Present this exact menu with `AskUserQuestion` (skip if the user already said what they want):

```
1. Notes & Summary — bullet points of every topic + concise narrative summary
2. Quick Summary — 3-5 bullet points, main takeaways
3. Deep Dive — detailed analysis of arguments, structure, key quotes
4. Action Items — practical takeaways as a numbered list of next steps
5. Content Repurpose — hooks, quotes, stats, social post ideas
6. Transcript — raw transcribed text (no analysis)
7. Other — describe what you need
```

If the user chose 7, follow up with a free-form question asking what custom prompt they want.

For the rest of the flow, **option 6 (Transcript) short-circuits**: skip every question below (language/model/tone/length/context) — it's raw output in the source language. Just ask the save destination (step 7) and jump to dispatch.

### 3. Ask extra context / goal (high-leverage, skippable)

Present with `AskUserQuestion`:

```
Queres dar contexto adicional (público-alvo, objectivo, foco específico)?
1. Skip — default
2. Yes, let me type it
```

If the user picks **Yes**, follow up with a free-form question: *"O que deves saber para tornar esta análise útil para ti?"* Examples to spark answers (don't list all — pick 1-2 that fit):

- "Estou a preparar um reel sobre este tópico"
- "Quero crítica técnica, não só resumo"
- "Vou transformar isto em notas para o meu curso"
- "Para mim, sou iniciante em X"

Store the answer verbatim. It gets prepended to the prompt as `"Additional context from the user: {answer}"`. This single question is the biggest lever on output quality — ask it by default; only skip if the user said something like "só um resumo rápido" up front.

### 4. Ask tone / audience (conditional)

Only ask this for analysis types **1, 2, 3, 5, 7** — it makes no difference for Action Items or Transcript.

```
Qual o tom/audiência?
1. Auto (let the model pick) — default
2. Notas pessoais — conciso, abreviações OK, sem fluff
3. Casual (conversacional)
4. Formal / profissional
5. Técnico / para devs
6. Script de vídeo (PT-PT, para teleprompter)
```

### 5. Ask output length (conditional)

Only ask this for analysis types **1, 2, 5, 7** — the others have implicit length (3 is always long, 4 is always action-list, 6 is raw).

```
Tamanho do output?
1. Auto — default
2. Curto (<100 palavras)
3. Médio (300-500 palavras)
4. Longo (sem limite)
```

### 6. Ask the output language

Present with `AskUserQuestion` (skip if user already specified a language):

```
1. PT-PT (European Portuguese — tu, PT-PT spelling) — default
2. PT-BR (Brazilian Portuguese — você, PT-BR spelling)
3. EN (English)
4. ES (Spanish)
5. Other — specify
```

Default to **PT-PT** unless the user is clearly working in another language in the conversation, in which case match that. This answer is used to build the language instruction appended to the analysis prompt in step 6.

Skip this question entirely for option 6 (Transcript) — that one is raw and keeps the source language.

### 7. Ask where to save the output

Present with `AskUserQuestion`:

```
1. Don't save — just show in chat — default
2. Default cache location — <out_dir>/extract-<N>-<lang>.md (alongside the view.json)
3. Custom path — specify a file path or directory
```

If the user picks 3, follow up asking for the path. Expand `~/` and make parent directories as needed. If the path is a directory, use the default filename inside it.

### 8. Dispatch

Build the prompt using the table below, then append any non-default answers from steps 3-5:

```
{base prompt from table}

Additional context from the user: {step 3 answer, if any}
Tone/audience: {step 4 answer, if not "auto"}
Length: {step 5 answer, if not "auto"}
Language: {step 6 answer — "PT-PT (tu, PT-PT spelling)" etc.}
```

Then read the cached content and produce the output yourself:

1. Read `view.json.transcript_file` with the Read tool (that's the plain-text transcript).
2. For Instagram views, also Read each `view.json.frames[i]` path so you can see the frames (Claude Code is multimodal).
3. For YouTube views, frames are usually absent — the transcript alone carries the full content.
4. Render the analysis following the assembled prompt. Keep it tight: no filler openers, no "Great question!", no "Let's dive in". Apply the human-prose guidance (no em-dashes, no inflated vocabulary, natural rhythm) by default.

| # | Prompt to use |
|---|---|
| 1 | "Analyze this video and provide: (A) a comprehensive list of bullet points covering every notable topic, insight, and detail; (B) a concise narrative summary from the speaker's perspective, faithful to their tone. Keep it easy to read while being complete." |
| 2 | "Summarize this video in 3-5 bullet points covering only the main takeaways." |
| 3 | "Provide a detailed analysis: main arguments, supporting evidence, structure, key concepts, and any notable quotes or data points." |
| 4 | "Extract all practical, actionable takeaways. Format as a numbered list of concrete next steps someone could implement." |
| 5 | "Extract content repurposing material: (A) 3-5 strong hooks or opening lines; (B) memorable quotes; (C) key stats / data points; (D) 3-5 social-media post ideas based on the video's content." |
| 6 | N/A — just read `transcript.txt` and print it. |
| 7 | The user's custom prompt. |

### 9. Save and present

If the user asked to save (step 7, option 2 or 3), write the output to the chosen path with this header:

```markdown
# <Analysis name>
Source: <url> (<platform> / <id>)
Generated: <ISO date>
Language: <lang>

---

<output>
```

Default filename when the user picks option 2 is `<out_dir>/extract-<N>-<lang>.md` where `<N>` is the analysis type number (1-7).

Always print the output to chat, whether or not it was saved. Keep any surrounding commentary to a single sentence — the user wants the analysis, not a recap of the pipeline.

## Edge cases

- **Empty transcript**: for YouTube, offer to re-run view with `--gemini-fallback`. For Instagram, check if `OPENAI_API_KEY` was set during capture; offer to re-capture. Don't plow ahead with a transcript-less input unless the user explicitly says so.
- **Very large transcript** (>100k chars, e.g. long podcasts): the session can handle it but will use more context. Consider asking the user if a condensed pre-pass would help before the full analysis.
- **Re-analyzing**: all cached `extract-*.md` files live side-by-side in the view's `out_dir`. Don't delete prior analyses when running a new type.
- **Prompt #6 (Transcript)** on Instagram where Whisper caught nothing: say so explicitly and stop; don't synthesize a transcript.
- **Mixed prompts**: if the user asks for something that doesn't map cleanly to 1-6, use option 7 and build a tight custom prompt.

## What NOT to do

- Do not invent a transcript if `view.json.transcript` is empty. Re-capture or stop.
- Do not describe frames visually unless the user asked for something that needs it (e.g. repurpose with visual hooks). Transcript is usually enough.
- Do not run the view step silently when the user pastes a URL — confirm first so they're aware of any API cost (Whisper, Gemini fallback).
- Do not paraphrase the transcript-only option (#6). It's raw output.
