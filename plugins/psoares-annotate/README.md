# psoares-annotate

Point at things on screen instead of describing them.

`/annotate <url>` opens the project's running app in a window of your own Chrome with a
picker on top: hover shows an inspector tip (tag, slot, size, colour, background, font,
radius), a click takes a print-screen of the element outlined in red among its surroundings
and opens a note. Notes pile up as numbered pins; Send files the round into the project.
`/annotations` makes Claude read the round, look at every screenshot, act on each note, and
delete the round.

## Install

```
/plugin marketplace add psoares/psoares-claude-plugins
/plugin install psoares-annotate@psoares-claude-plugins
```

Needs Google Chrome installed. On first `/annotate` the skill runs `npm install` inside the
plugin once, for `playwright-core` (no browser download; it drives your Chrome).

## Use

1. Run the app (`localhost:3000`, whatever it is).
2. `/annotate http://localhost:3000`. A Chrome window opens with a pill at the top right.
3. Click **Annotate**, click any element, write what is wrong, `⌘↩`. Repeat, on any page.
4. **Send**. Then tell Claude "check the annotations" or run `/annotations`.

## What lands in the project

```
.annotations/<stamp>/        one folder per Send, gitignored (added for you)
  notes.json                 every note: your text, url, route, data-slot chain, CSS path,
                             tag, classes, text, attributes, computed styles, viewport, rect
  1.png, 2.png, …            the element, outlined in red, with 32px around it, at 2x
```

Claude deletes a round after reading it, so the folder only ever holds what is pending.

## Skills

| Skill | What it does |
| --- | --- |
| `annotate` | Opens the window on a URL (background process, lives until the window closes). |
| `annotations` | Reads pending rounds, acts on each note, deletes the round. |

## How it works

`scripts/annotate.mjs` launches Chrome through `playwright-core` with a persistent profile
(`~/.claude/psoares-annotate/profile`, so logins stick) and injects `scripts/picker.js` into
every page. The picker talks to the process through exposed functions; screenshots are the
browser's own pixels (`page.screenshot` with a clip), so canvases, iframes, fonts and floating
menus come out as on screen. No server, no extension, nothing sent anywhere.
