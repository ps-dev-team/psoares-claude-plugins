# psoares-annotate

Point at things on screen instead of describing them.

`/annotate <url>` opens the project's running app in a window of your own Chrome with a
picker on top: a small dark panel, in the style of the Product Studio's prototype controls,
that you drag by its grip and fold by its chevron (both remembered per site). It holds the mode
(`Annotate` or `Navigate`), the list of this round's notes, **Send**, and the keys. In annotate
mode, hover shows an inspector tip (tag, slot, size, colour, background, font, radius), and a
click takes a print-screen of the element outlined in red among its surroundings and opens a
note. Notes show on the page as numbered pins; Send files the round into the project.
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
2. `/annotate http://localhost:3000`. A Chrome window opens with the panel at the bottom left;
   drag it by its grip wherever it is out of the way.
3. Press `` ` `` or `´` (or pick **Annotate** in the panel); click any element, or point at it and
   press `A`, write what is wrong, `⌘↩`. Repeat, on any page. Fold the panel with its chevron;
   folded, it shows the mode and how many notes wait.
4. Review the list, then **Send**. Then tell Claude "check the annotations" or run
   `/annotations`.

### The notes list

Every note of the round, in the order it will be sent: number, the start of the text, the page
it is on (`↗` when it is another page).

- **Click a note** to scroll to its element and outline it. A note from another page takes you
  there first.
- **Edit** (pencil) to change the text: `⌘↩` or clicking away saves, `Esc` cancels.
- **Delete** (bin), or the `×` on its pin on the page.
- **Drag** a note by its grip to reorder; the numbers on the list and the pins follow.

The panel, pins, outlines and note box are hidden while a screenshot is taken, so they never
show in one.

### Keys

| Key | What it does |
| --- | --- |
| `` ` `` or `´` | Switch between annotate and navigate. The mode stays until you switch again, across pages in the window. |
| hold `⌥` / `Alt` | Pause annotate mode: no outline, clicks go to the page. Release to resume. |
| `A` | In annotate mode, open a note on the element under the pointer, as a click would. |
| `Esc` | Close the open note box; with none open, back to navigate. |
| `⌘↩` / `Ctrl+↩` | Add the note. |

None of these fire while you type in a field, the page's or the note box. The panel's header
shows the mode: grey `NAVIGATE`, yellow `ANNOTATE`, and `PAUSED` while Alt is held. The keys are
listed in the panel, and on the header's mode label as a tooltip. On macOS, Option-click on a link downloads it: that is Chrome, not the picker.
The switch key is the backtick, or the acute accent `´` for keyboards without one (on a
Portuguese keyboard, the key right of `P`, alone). The accent is a dead key there; the picker
catches it, so no accent lands on the page, and it never fires inside a field, where the accent
types as usual. If neither works on your layout, the panel's mode buttons always do.

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
every page. The picker lives in a shadow root, with the host's inline style set `!important`, so the
page's CSS cannot restyle it and its CSS cannot touch the page. Its icons are Lucide's (ISC),
inlined; nothing is fetched. The picker talks to the process through exposed functions; screenshots are the
browser's own pixels (`page.screenshot` with a clip), so canvases, iframes, fonts and floating
menus come out as on screen. No server, no extension, nothing sent anywhere.
