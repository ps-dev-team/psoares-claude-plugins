# annotations

## Purpose

Read the rounds the user filed through the annotate window, act on every note, and delete
the round, so `.annotations/` only ever holds what has not been read.

## When to Use

The user says they sent, added or made annotations, or asks to check them, or `/annotations`.

## Input

`<project>/.annotations/<stamp>/notes.json` and `<n>.png`. A note carries `note` (the
user's words), `url`, `route`, `title`, `slots` (the `data-slot` chain with variant, size
and state, when the app sets them), `path` (CSS path from the nearest id), `tag`, `classes`,
`text`, `attrs`, computed `styles`, `viewport`, `rect`, `image`.

## Output

Code changes in the project, one per note, each verified where the note was made; a per-note
report; the round's folder deleted through `scripts/done.mjs <stamp>`, which refuses anything
under `.annotations/` that is not a round (no `notes.json`).

## Non-Goals

No committing of rounds (they are gitignored). No archive of past rounds.
