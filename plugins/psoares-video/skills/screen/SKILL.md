---
name: screen
description: Record a web app or website in real headed Chrome from written instructions or a script, timed to a voice or free-running for B-roll: one or two real windows (for example a coach and a client side by side), the pointer and zooms recorded as data. Use for product demos, course lessons, walkthroughs and B-roll: "record the screen for lesson 9", "show this flow in the app", "make B-roll of the dashboard", "grava o ecrã desta lição". Pair it with the voice skill before and the assemble skill after.
---

# Screen

Instructions in, recording out. You write **beats**: what happens on screen and when. The
recorder runs them in real Chrome windows and saves the frames, the pointer's path and the
zooms. The assemble skill turns that into a video.

What to show comes from the user (a script, notes, an old recording). **Where to click comes
from the page**, found by probing, never guessed.

## Before anything

- **Headed Chrome only, never headless.** Playwright drives it. Some users allow Playwright
  only for recording: check their memory, and use it for this and nothing else.
- **One heavy job at a time.** One recording or one render, not both. Never kill processes by
  name; stop only what you started.
- **Keep the screen awake and unlocked** for the whole take: run under `caffeinate -i` on a
  Mac. A locked screen stops Chrome painting and the take stalls.
- **The project folder** has `video.config.json` and, for an app, `context.md`. Read both. If
  there is no `context.md`, write one from `references/context-template.md` as you learn the app,
  and keep it current: it is how the next video starts faster.
- **Playwright** must be findable: in the project (`pnpm add -D playwright`) or at the path in
  `config.playwright`.

## 1. Sign-in

Never script a login and never try to get past a captcha. Each account has its own Chrome
profile (`config.profiles`, e.g. in `~/.config`, so a restart signs nobody out), and the user
signs it in once with `lib/login.mjs`, which opens that profile in plain Chrome: captchas refuse
a window Playwright drives. After that, recordings open signed in. See `references/sign-in.md`.

Banners the app shows on arrival (a cookie or privacy banner, a tip) go in `config.app.dismiss`
by their button's name; decline rather than accept, so recordings add nothing to analytics. Set
`config.app.timezone` and `config.app.locale` to the audience's, or times read wrong.

## 2. Plan: show, don't tell

Read the script line by line and decide what is on screen during each one.

- **Every line that names something with a screen shows it.** "You can print it" opens the
  print preview. "It sends an invite" shows the email. "Compare the snapshots" opens the
  comparison. Do not wait for the script to say "I'm opening". The `context.md` "Show" section
  lists these for the app; add to it when you find one.
- **A line with nothing to show still has a place to look:** hover the thing it talks about.
- **Mark irreversible steps** (deleting, closing, sending) before recording, and plan how the take
  undoes what it adds. Ask the user before anything that cannot be undone or reaches real people.
- **Zoom where the eye needs help:** a small control, typing, a detail worth reading. Zoom out
  before the pointer travels far. Not on every click.
- **Cut into segments** wherever the account or the scene changes; the assembler puts a fade
  there.

## How the pointer behaves

The recorder moves the pointer like a hand and records what the page shows, so the video reads
like a person using the app. Write beats with this in mind; none of it needs code in the beat.

- **Moves** take time by distance (a short hop is quick), bow slightly, start fast and settle.
  `ms` on `hover`, `click`, `moveTo` is the most a move may take, not its length.
- **The cursor shape** is the page's own, recorded at every move from the CSS cursor under the
  pointer (as Screen Studio records the system's): arrow, I-beam over text, open hand where the
  page offers to grab, not-allowed, resize arrows. The pointing hand is shown **only around a
  click** (from just before the press to just after the release), and a closed hand while the
  button is held (a drag).
- **A click** waits for the drawn pointer to land, then the pressed element dips and springs
  back (an elastic scale drawn by the page, so it is in the frames).
- **A drag** is `w.drag(handle, [x, y])` or `w.dragBy(handle, dx, dy)`: press, carry, let go.
  Use it for anything the user would drag: a panel, a card, a file, a slider.
- **Only real pointer events** from the page itself are tracked; events apps or iframes fire on
  their own are ignored (one in the path makes the drawn pointer jump).

## 3. Probe

Before writing a beat, look at the real page:

```sh
node "${CLAUDE_PLUGIN_ROOT}/lib/probe.mjs" <project> <account|-> <url> [snippet.js]
```

It writes `raw/probe-<name>.aria.txt` (every button, field and label) and a screenshot. A snippet
can click through to a later state and `snap('name')` on the way. `VIEW=1024x1152` probes at
another window size; layouts change with width, so probe at the size you record at.

Take every name from the probe: `role('button', { name: 'Complete session' })`.

## 4. Write the beats

`videos/<id>.mjs`. The full shape, the helpers and the lessons learned are in
`references/beats.md`. In short:

```js
export const gaps = { 9: 1.2 };            // seconds of silence before line 9
export const segments = (L) => [{
  name: 'main', start: 0,
  windows: [{ account: 'coach', url: '/today' }],
  setup: async (w) => { /* off camera */ },
  beats: (w) => [
    [L(1, 'clients'), () => w.click(w.role('link', { name: 'Clients' }))],
    [L(3), () => w.zoom(w.role('button', { name: 'Print' }))],
  ],
  cleanup: async (w) => { /* undo what the take added */ },
}];
```

`L(i, 'word')` is when line `i` says that word; the beat starts a little before it, so the pointer
lands on the word. Without a voice (B-roll), use seconds and export `length`.

## 5. Record

```sh
caffeinate -i node "${CLAUDE_PLUGIN_ROOT}/lib/run.mjs" <project> <id> [segment]
```

Run it in the background and wait for it to finish. Watch the log:

- `missing <locator>`: the element was not found. Probe and fix the beat.
- `late 1.2s`: the beat before took too long. Add a gap, or move work into `setup`.
- `dialog: …`: a native dialog came up and was dismissed.

Re-record a single segment by naming it.

## 6. Check

Never hand over a take you have not looked at. After assembling, make a contact sheet at the
moments that matter and look at it:

```sh
sh "${CLAUDE_PLUGIN_ROOT}/lib/sheet.sh" <project>/build/<id>.mp4 <project>/build/<id>-sheet.jpg 5 12 30 41
```

Check that each step really happened (the dialog opened, the value changed, the right item is
selected), not only that the screen looks plausible.
