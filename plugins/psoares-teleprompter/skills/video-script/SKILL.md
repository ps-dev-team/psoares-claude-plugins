---
name: video-script
description: >-
  Use when writing, rewriting or tightening the words of a video someone will
  record to camera or over a screen recording: course lessons, app and
  software walkthroughs, product demos, tutorials, and (later) social media
  videos. Writes one sentence per line, each line a take that can be
  recorded, cut and re-recorded on its own, so the script doubles as the cut
  list for editing. Trigger phrases: "write the script for this lesson",
  "script for this video", "rewrite this script", "make the script
  line by line", "lesson script", "demo script", "guião da lição", "escreve o
  guião", "guião linha a linha", "reescreve o guião". Use it with
  teleprompter-script when the script is read from the Markdown
  Teleprompter app.
---

# Video scripts

A script someone records one sentence at a time. They say a line, stop, start again, say the
next line. In the edit, every take is cut at its edges and the bad ones are thrown away. So
each line has to survive on its own, and the script is also the map the editor (a person or
an AI given the script and the video) uses to match takes to lines.

## Load first

1. **`human-prose`** (from `s2-writing` or `psoares-writing`, whichever is installed). It sets
   the voice and removes what sounds written by AI. If it is not installed, follow the short
   version under "Voice" below.
2. **`teleprompter-script`**, only when the script will be read from the Markdown Teleprompter
   app and needs its directives (`::chapter`, `::cue`, `::note`, tabs).

Then open the reference for the format:

| Format | Reference |
| --- | --- |
| Course lesson, app or software walkthrough, demo, tutorial | [references/lesson.md](references/lesson.md) |
| Social media video | Not written yet. Ask the user for the rules and do not guess. |

## The take rules

These hold for every format.

- **One sentence per line.** One line is one take. A blank line between lines, so each one
  stands alone on the prompter.
- **One breath.** A line is at most about 15 words, or 5 seconds said aloud. Longer than that,
  split it into two sentences. A list read as a sentence ("It rests on three things:" then
  `- clients,` `- processes,` `- and sessions.`) counts as one take.
- **Each line stands alone.** No line leans on the one before it: no "And so…", "As I said…",
  "This…" pointing back. Any take can be re-recorded, cut or moved without breaking its
  neighbours. Name the thing again rather than saying "it" across lines.
- **Each line starts clean.** The first word is easy to say from cold, right after pressing
  record. Avoid opening on a hard cluster, a number or a product name the speaker trips on.
- **Words on the page are the words said.** No cues, no stage directions, no `[brackets]`, no
  parentheses in the read text. Directions go in `::cue` when the teleprompter is used, or
  nowhere.
- **Write numbers and symbols as said:** "ten clients", not "10 clients"; "and", not "&".
- **The script is the cut list.** Line N is take N. Keep the order the video will have, so an
  editor can lay the takes down top to bottom. Do not number the lines in the file; the line
  order is the numbering.
- **One direction.** The video moves forward through the product or the idea and never
  jumps back. If something needs to come back, it comes back as a new line that names it, not
  as "like we saw before".

## Voice

The short version, for when `human-prose` is not available:

- Write how the speaker talks: "you" and "I", contractions, plain words.
- One idea per line. Cut adjectives that do no work.
- No "Let's dive in", "In today's video", "It's important to note", "seamless", "powerful".
- Read each line aloud in your head. If you would not say it that way, rewrite it.

## Languages

Write in the language the user asks for. When the script exists in two languages, the
translation matches **line for line**: the same number of lines, and line N in one language is
line N in the other. A line that will not fit the breath limit in the other language is split
in both, so the two files stay aligned.

## Checklist

- [ ] Every line is one sentence, within one breath.
- [ ] No line starts with a word that points back ("And", "So", "This", "It") unless it reads
      fine with the previous take removed.
- [ ] No cues, brackets or directions in the read text.
- [ ] The order is the order of the video, and it never jumps back.
- [ ] The format's own checklist in its reference passes.
- [ ] If there are two languages, both files have the same number of lines.
