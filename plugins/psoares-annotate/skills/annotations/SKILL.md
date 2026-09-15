---
name: annotations
description: >
  Read the rounds of on-screen annotations the user filed from the annotate
  window (.annotations/ in the project), look at every screenshot, act on
  each note, and delete the round. Use when the user says "check the
  annotations", "I sent annotations", "sent a round", "added a couple of
  notes in the annotator", "vê as anotações", "enviei anotações", or
  `/annotations`; also when the annotate window was opened earlier in the
  session and the user says they are done or asks you to take a look, or
  when you notice `.annotations/` in the project with rounds inside. Not for
  code comments or docstrings called "annotations".
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# Annotations

A round is what the user filed between two Sends in the annotate window:

```
.annotations/<stamp>/
  notes.json     every note of the round, in order
  <n>.png        the element outlined in red among its surroundings, 2x
```

Each note has `note` (the user's words), `url`, `route`, `title`, `slots`
(the `data-slot` chain with variant, size and state, when the app sets them:
the component in its own words), `path` (CSS path from the nearest id),
`tag`, `classes`, `text`, `attrs`, computed `styles`, `viewport`, `rect`,
`image`.

## Steps

1. `ls .annotations/` in the project. If the project documents another
   location (a CLAUDE.md, a skill of its own), use that. Nothing there: say
   so and stop.
2. For every round, oldest first: print each note as one line
   (`n | route | slots or path | note`) so the user sees what you are
   working from, then Read every PNG. Look at the image before deciding
   anything: the note is short and the picture is what it points at.
3. Act on each note. `slots`, `attrs` and `styles` usually say which
   component, which state and what it resolved to; `url` and `path` let
   you open the page headless and measure. Verify each fix the way the note
   was made: on that route, in that state.
4. When a round is handled, remove it:

   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/done.mjs" <stamp>
   ```

   The script only deletes children of `.annotations/` that hold a
   `notes.json`, so a wrong argument cannot take anything else with it.
   The directory only ever holds what has not been read; a round you were
   told to leave, or could not finish, stays and comes back next time. It
   is gitignored; never commit it.
5. Report per note: what it was, what changed, where.

Ask before acting only if a note could mean two materially different
changes. A note that is a question gets an answer, not a change.
