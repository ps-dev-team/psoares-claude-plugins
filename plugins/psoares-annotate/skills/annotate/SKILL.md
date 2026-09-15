---
name: annotate
description: >
  Open the project's running app in a Chrome window with an annotation picker,
  so the user can click elements and leave notes that land in the project as
  screenshots plus details for the agent. Use when the user says "/annotate
  <url>", "open the annotator", "let me annotate", "I want to point at things
  on screen", "abre o anotador", "deixa-me anotar", or asks for the annotation
  window on a URL or port.
license: MIT
metadata:
  author: psoares
  version: "0.1"
---

# Annotate

Opens `<url>` in a window of the user's own Chrome with the picker injected.
The user annotates and presses Send; each round lands in the project as
`.annotations/<stamp>/`. Reading rounds is the `annotations` skill.

## Steps

1. Work out the URL. `$ARGUMENTS` if given. Else look for a running dev
   server in the project (`package.json` scripts, a `port` in a config,
   `lsof -iTCP -sTCP:LISTEN -P | grep node`). Else ask for it. Never guess a
   port silently.
2. The plugin root is two directories above this skill's base directory.
   If `<plugin root>/node_modules/playwright-core` is missing, run
   `npm install --prefix <plugin root>` once (it installs `playwright-core`
   only; Chrome is the user's own).
3. Launch in the background, from the project directory, so rounds land in
   the project:

   ```
   node <plugin root>/scripts/annotate.mjs <url>
   ```

   Use the Bash tool with `run_in_background: true`. The process lives until
   the user closes the window; do not wait on it.
4. Tell the user, in two lines: the window is open; click the pill's
   Annotate, click things, write notes, Send, then say "check the
   annotations" (or `/annotations`).

## Options

`--out <dir>` writes rounds elsewhere than `<cwd>/.annotations`.
`--profile <dir>` uses another Chrome profile directory.

## If it fails

- `playwright-core is not installed`: step 2.
- Chrome not found: Playwright looks for Google Chrome in its standard
  location; say so and ask where Chrome is, or install it.
- `ERR_CONNECTION_REFUSED`: the app is not running at that URL; say which
  URL was tried.
