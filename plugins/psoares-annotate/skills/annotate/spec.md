# annotate

## Purpose

Let the user point at things on screen instead of describing them. `/annotate <url>` opens
the project's URL in a window of the user's own Chrome with a picker injected (a 16px dot, draggable, remembered per site,
that unfolds into an annotate/send strip): hover shows an
inspector tip, a click takes a print-screen of the element (outlined in red, 32px of
surroundings, the browser's own pixels) and opens a note. Send files the round into the
project as `.annotations/<stamp>/notes.json` plus one PNG per note.

## When to Use

Any project with something running in a browser. The user says "let me annotate", "open the
annotator", "I want to point at things", or `/annotate <url>`.

## How it works

`scripts/annotate.mjs` launches Chrome through `playwright-core` (`channel: 'chrome'`, no
browser download) with a persistent profile under `~/.claude/psoares-annotate/profile`, so
logins survive between runs. `scripts/picker.js` is injected into every page
(`addInitScript`). The picker calls functions the script exposes (`exposeFunction`): shot,
add, remove, state, send. Notes wait in the process, not in the page, so navigating between
pages before Send loses nothing. There is no server and nothing to install in the browser.

Screenshots come from `page.screenshot({ clip })`: canvases, iframes, fonts and floating
menus come out as on screen. The outline is set on the element itself while the shot is
taken, with its transition off.

The round is written into `<cwd>/.annotations/`, and `.annotations/` is appended to the
project's `.gitignore` if the project is a git repo and does not have it yet.

## Output

- The window, until the user closes it. The script runs in the background for the session.
- Per Send: `.annotations/<stamp>/notes.json` and `<n>.png`, read by the `annotations` skill.

## Non-Goals

No Chrome extension, no annotating the user's own tabs, no server, no cloud. No editing of
the page. Reading rounds is the other skill's job.
