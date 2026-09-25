# psoares-annotate

Point at things on screen instead of describing them.

`/annotate <url>` opens the project's running app in a window of your own Chrome with a
picker on top: a 16px dot you can drag anywhere (it remembers its place per site); click it
and a strip unfolds with the mode (`navigate` or `annotate`) and `send`. In annotate mode, hover shows an inspector tip
(tag, slot, size, colour, background, font, radius), a click takes a print-screen of the
element outlined in red among its surroundings and opens a note. Notes pile up as numbered
pins; send files the round into the project.
`/annotations` makes Claude read the round, look at every screenshot, act on each note, and
delete the round.

## Install

```
/plugin marketplace add ps-dev-team/psoares-claude-plugins
/plugin install psoares-annotate@psoares-claude-plugins
```

Needs Google Chrome installed. On first `/annotate` the skill runs `npm install` inside the
plugin once, for `playwright-core` (no browser download; it drives your Chrome).

## Use

1. Run the app (`localhost:3000`, whatever it is).
2. `/annotate http://localhost:3000`. A Chrome window opens with a small dot at the top right;
   drag it wherever it is out of the way.
3. Press `` ` `` (or click the dot, then **navigate** to switch it to **annotate**); click any
   element, or point at it and press `A`, write what is wrong, `⌘↩`. Repeat, on any page. Click
   the dot again to fold the strip away; a badge shows how many notes wait.
4. **send**. Then tell Claude "check the annotations" or run `/annotations`.

### Keys

| Key | What it does |
| --- | --- |
| `` ` `` | Switch between annotate and navigate. The mode stays until you switch again, across pages in the window. |
| hold `⌥` / `Alt` | Pause annotate mode: no outline, clicks go to the page. Release to resume. |
| `A` | In annotate mode, open a note on the element under the pointer, as a click would. |
| `Esc` | Close the open note box; with none open, back to navigate. |
| `⌘↩` / `Ctrl+↩` | Add the note. |

None of these fire while you type in a field, the page's or the note box. The dot shows the
mode: a grey ring is navigate, a red dot is annotate, a red ring is annotate paused. Hover the
dot for the keys. On macOS, Option-click on a link downloads it: that is Chrome, not the picker.
The switch key is the backtick character, or the key where a US keyboard has it (left of `1`).
On some non-US layouts neither matches; the dot's strip always works.

## What lands in the project

```
.annotations/<stamp>/        one folder per Send, gitignored (added for you)
  notes.json                 every note: your text, url, route, data-slot chain, CSS path,
                             tag, classes, text, attributes, computed styles, viewport, rect
  1.png, 2.png, …            the element, outlined in red, with 32px around it, at 2x
```

Claude deletes a round after handling it (`scripts/done.mjs <stamp>`, which only removes
folders holding a `notes.json`), so the directory only ever holds what is pending. A round
you asked Claude to skip, or one it could not finish, stays and comes back next time.

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
