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
- **Zoom only to read something small and dense** (see "Keep it plain"). Most beats have no zoom.
- **Cut into segments** wherever the account or the scene changes; the assembler puts a fade
  there.

## How the pointer behaves

The recorder moves the pointer like a hand and records what the page shows, so the video reads
like a person using the app. Write beats with this in mind; none of it needs code in the beat.

- **Moves** take time by distance (a short hop is quick), bow slightly, start fast and settle.
  `ms` on `hover`, `click`, `moveTo` is the most a move may take, not its length.
- **A click waits for the hand to stop.** Before pressing, the pointer rests in proportion to
  how far it travelled (about 120 ms in place, up to about 380 ms after a long move), so a click
  never lands mid-move. Budget for it when beats are tight.
- **The cursor shape** is the page's own, recorded at every move from the CSS cursor under the
  pointer (as Screen Studio records the system's): arrow, open hand where the page offers to grab, not-allowed, resize arrows. A shape shows only once it has held for about a
  quarter of a second, so crossing text on the way somewhere stays the arrow. The I-beam shows only while the hand works with text (clicking into a field,
  selecting); resting on text is the arrow. The pointing hand is shown **only around a
  click** (from just before the press to just after the release), and a closed hand while the
  button is held (a drag).
- **A click is the hand's gesture, never the page's.** The recorder never animates what is
  filmed. The cursor lands as the arrow, turns into the pointing hand about 0.15 s before the
  press, dips at the press and springs back with a small bounce, then is the arrow again. It
  does this for any click, whatever is under it.
- **Selecting text** is `w.select(target, ms, word)`: a press and drag that starts on text keeps
  the I-beam, with no hand, and the page shows its real selection. Use it only when the voice
  calls for it: text about to be deleted or replaced, or the one word the voice is naming. It is
  not a way to point at things in general.
- **A drag** is `w.drag(handle, [x, y])` or `w.dragBy(handle, dx, dy)`: press, carry, let go.
  The cursor is the open hand up to the press, the closed hand while held, and never the pointing
  hand. The carry takes a steady `ms` (default 1.1 s, no hook), and the drawn cursor follows it
  with no spring lag, so it stays on what it carries.
  Use it for anything the user would drag: a panel, a card, a file, a slider.
- **No two moves alike.** Each move draws its own length, arc, ease and wobble from a seeded
  random source: it speeds up and settles at the ends, and in between its speed wavers and the
  line drifts a little off true. Some long moves end in a hook (past the target, curling back).
  The seed is the video, segment and window, so a re-take repeats the same take.
- **The hand rests like a hand.** In a pause of about two seconds or more between beats, the
  hand that moved last sometimes drifts: a small loop, a sway, a figure eight. Each rest is
  generated new (random circles added together), never picked from a fixed list.
  `pointer.human: false` turns hooks and rests off; `pointer.rests: false` turns off only the
  rests (some viewers read a small drift in place as a glitch).
- **Gestures and the selection box** (`w.circle`, `w.underline`, `w.select`, `w.marquee`,
  `w.shake`) are specials, used rarely. Read "Keep it plain" below before using any of them.
  `w.circle(target)` is a quick loop around an area; `w.underline(target)` goes back and forth
  under it; `w.shake()` shakes and the drawn cursor grows, as macOS does; `w.marquee(target)`
  drags a dashed, rounded selection box around an area, drawn in the render (the page is never
  pressed), which lets go of the cursor at the corner and stays `hold` ms. Their size, turns and
  speed vary each time.
- **Motion blur on the pointer alone,** as Screen Studio's: a fast cursor smears along its path,
  a still one is sharp. The camera is never blurred. `pointer.blur: false` turns it off.
- **Only real pointer events** from the page itself are tracked; events apps or iframes fire on
  their own are ignored (one in the path makes the drawn pointer jump).

## Keep it plain

The video is a person using the app calmly. Plain moves, hovers and clicks carry almost all of it,
and the voice does the explaining. Zooms, gestures and pauses are specials: each one is a choice
made for one moment, and a video full of them looks restless and buggy. When unsure, leave it out.

- **Zoom: only to read something small and dense.** A zoom is for a narrow, packed area whose
  details the viewer must read and cannot at full size: a side panel with a timeline, a small menu
  gone through item by item, a row of small labels or numbers. Never to frame a large area (a whole
  form, an editor, a panel being filled in, a page), never to follow work being done, never for
  emphasis. If the thing is readable in the full frame, no zoom. Zoom in on that one place, do
  the moves there, and **zoom out before the pointer leaves for somewhere else**. Never move a zoom
  from one place to another, and never zoom in again within a few seconds of zooming out: the
  camera swinging across the screen reads as a glitch. Most lessons need one zoom or none.
- **Move only when the voice gives a reason.** The pointer goes to a thing when the voice names it
  or the action needs it, then stays still. No hovers to fill time, no tour of nearby controls, no
  extra trips between beats. A still pointer while the voice talks about what is on screen is
  right.
- **Gestures: one at a time, only for a reason.** A loop around an area when the voice introduces
  that area and the eye would not find it on its own. An underline or a selection only for the
  exact words the voice is about (text being edited, deleted, replaced). The selection box only
  when the user asks for it, or once to frame a group the voice names together. Never put two
  gestures on the same thing, never a gesture on every item of a list, and never a gesture where a
  hover is enough. A whole lesson usually has a handful at most.
- **The I-beam never shows on its own.** Hover headings and text with the arrow. Only clicking
  into a field, typing, or `w.select` shows it.
- **Pauses: only where the screen needs time.** A gap after a click that opens something big (a
  page, a dialog, a generated result), or to hold on a result the voice is about. Not after every
  click, not after a menu that is gone through at once, and not to fill silence. See "Give the
  screen time"; when in doubt, no gap.
- **Plain is the default for each line.** For each line of the voice, first write the plainest
  beat (move there, hover, click). Add a special only if the line cannot land without it.

The recorder flags in the report a zoom moved without zooming out, and a zoom in right after a zoom
out. Fix those before handing over.

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

### Give the screen time

The voice sets the pace, and the screen must never rush to keep up with it. A viewer needs to see
what a click did before the voice moves on. When the screen needs more time than the voice gives,
add a pause with `gaps`, never a faster pointer. A gap puts silence before a line; the beats from
that line on move later, and the assembler cuts the same silence into the voice at its natural
pause, so the voice is not cut mid-word.

Add a gap before the next line only when:

- **A click opens something big**: a page, a dialog, a panel, a generated result. Let it arrive
  and sit still for a moment (about 0.6 to 1 s) before the voice moves on. A menu that the voice
  goes through at once needs none.
- **Two actions would run back to back**: a click, then at once a rush to the next thing because
  the next line starts. Put the pause between them, so each action is seen.
- **The result is the point**: something saved, filled in or changed that the voice is about.
  Hold on it briefly.

Never add a gap to make room for a gesture or a zoom: drop the gesture, or start it earlier.
A beat that runs late is fixed first by making it simpler, and only then by a gap.

How to find them:

1. Before recording, read the beats against the timings: wherever a beat's action plus what it
   opens takes longer than the time until the next beat, add a gap of the difference plus about
   half a second.
2. After recording, watch the log: `late` and `slow` lines mark beats that had no room. Make the
   beat simpler first; only if it still needs the time, add a gap before the line that follows,
   and record again.
3. Watch the result: anywhere the pointer leaves before the screen has settled, add a gap there.

**A pause never costs the voice anything.** The voice is fixed and the picture fits around it:
never speed it up, trim it, stretch it or generate it again to fit the screen. A gap goes only
between two lines, inside the silence the voice already has there, with a short fade either side.
If there is no real pause before a line, the assembler stops and says so; move the gap to
another line, or let the beat start earlier. Listen to every pause in the result: it must sound
like the speaker taking a breath, never like a cut.

Keep gaps rare: a lesson that stops after every click drags and feels broken. A pause of 0.5 to
1 s is usual; more than 1.5 s needs something on screen worth looking at.

### The plan

The beats file is code. Before recording, turn it into a plan anyone can read:

```sh
node "${CLAUDE_PLUGIN_ROOT}/lib/plan.mjs" <project> <id>
```

It writes `build/<id>.plan.md`: each voice line with its time, each scene's starting point (the
account, the screen, what runs off camera before it), and every beat in plain words. Read it
yourself: a line with no reason to move should say "(still)". Give each window a `screen` label
(`{ account, url, screen: 'Today' }`) and each account a `label` in the config, so the plan names
them in words.

It also checks that every `gap` falls in a real silence of the voice and prints `no silence in
the voice before line N` when one does not (the assembler would refuse it later). Move or drop
that gap before recording. After a new voice, run the plan again: the pauses move with it.

The plan also goes to `build/<id>.plan.json`. Before anything is recorded, the review page (see
the assemble skill, `/?v=<id>`) plays the voice alone with the plan: the current line, the list of actions
with the current one lit, and each planned beat on its track (clicks, hovers, zooms, specials,
pauses, scene starts). The user can comment there as on a draft. Offer it when the plan changed a
lot or the user asked to see the beats; never as a required step. Stop the server when that
review is done, as the assemble skill says.

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
sh "${CLAUDE_PLUGIN_ROOT}/lib/sheet.sh" <project>/build/<id>.draft.mp4 <project>/build/<id>-sheet.jpg 5 12 30 41
```

Check that each step really happened (the dialog opened, the value changed, the right item is
selected), not only that the screen looks plausible.

Offer the user a draft review before the full render (the assemble skill, "Draft and review").
It is optional. When they review, their comments come back pinned to moments in
`review/<id>.json`; answer every one there.
