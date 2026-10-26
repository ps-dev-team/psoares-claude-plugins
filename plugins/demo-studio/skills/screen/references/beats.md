# Beats

A video's beats live in `videos/<id>.mjs` in the project. The recorder imports it.

## Shape

```js
// What the video shows, in segments. A segment is one scene: the same windows
// from start to end. The assembler fades between segments.
export const gaps = { 9: 1.2, 17: 0.8 };   // seconds of silence before these lines
export const length = 40;                  // B-roll only: seconds, when there is no voice

export const segments = (L) => [
  {
    name: 'together',                      // raw/<id>-together-<account>
    start: 0,                              // voice time; later segments start at a line, L(25)
    windows: [
      { account: 'admin', url: '/boards/5', view: { width: 1024, height: 1152 } },
      { account: 'user', url: '/boards/5', view: { width: 1024, height: 1152 } },
    ],
    setup: async (admin, user) => {},      // off camera, before recording
    beats: (admin, user) => [
      [L(1, 'left'), () => admin.moveTo(560, 620, 700)],
      [L(6, 'open'), () => Promise.all([admin.click(...), user.click(...)])],
      [L(9, "Sam's"), () => user.click(...), { lead: 1.0 }],
    ],
    cleanup: async (admin, user) => {},    // off camera, after recording
  },
];
```

- **A beat** is `[time, fn, opts]`. It starts `lead` seconds (default 0.45) before `time`, so the
  pointer arrives as the word is said. A beat that opens a page or waits for one needs a larger
  `lead` (0.8 to 1.2). `max` (ms, default 15000) stops a beat that hangs.
- **`L(i)`** is line `i`'s start, **`L(i, 'word', n)`** the `n`-th time that word is said in it
  (case-insensitive, punctuation dropped). Lines count from 0, directions excluded: the voice
  skill prints them. A missing word throws before anything is recorded.
- **`gaps`** give the screen time the voice does not: the line is pushed later, and the assembler
  cuts the same silence into the voice at the real pause before it. Use them so the pointer never
  rushes: after a click that opens something, between two actions that would run back to back,
  to hold on a result. When to add one is in the skill, "Give the screen time".
- **`view`** sets a window's CSS size. Two windows side by side are usually half the frame wide
  and full height each (1024 × 1152 for a 2048 × 1152 frame), and appear in the browser frame.
- Segments overlap their neighbours by `transition.pad` seconds, so the fade has picture on both
  sides.

## The window

Each window `w` has:

| | |
|---|---|
| `w.go(url)` | Load a page (relative to `app.base`), wait for it, dismiss `app.dismiss` buttons. |
| `w.click(locator, ms, at)` | Move there over `ms`, then press and release. `at` = point in the box, 0..1. |
| `w.hover(locator, ms, at)` | Move there and stay. Returns false (and logs `missing`) when not found. |
| `w.moveTo(x, y, ms)` | Eased move to a CSS point. |
| `w.type(text, delay)` / `w.key('Enter')` | Keyboard. Click the field first. |
| `w.drag(locator, [x, y], ms)` / `w.dragBy(locator, dx, dy, ms)` | Press on a handle, carry it, let go. Drawn as a closed hand while held. |
| `w.select(locator, ms, word)` | Select an element's text, or only `word` in it: press at its start, drag to its end, let go. The I-beam throughout. |
| `w.marquee(target, { hold, pad, ms })` | Drag a selection box around an area (an element or `[x, y, w, h]`): dashed, rounded, light fill, soft shadow. Drawn by the assembler; nothing is pressed in the page. Stays `hold` ms, then fades. |
| `w.circle(locator)` | A loop around an element, a little uneven, as if circling it on paper. |
| `w.underline(locator)` | Back and forth under an element, like underlining it while reading. |
| `w.shake()` | A quick shake side to side; the drawn cursor grows while it lasts (macOS shake-to-find). |
| `w.rest(ms)` | A small generated drift that comes back to the same point. `record()` adds these in long pauses on its own. |
| `w.scroll(dy, ms)` | Smooth wheel scroll. |
| `w.zoom(locator \| [x, y], scale)` | The camera zooms there from now (default `camera.zoom`, 2). Only to read a small, dense area (a side panel with a timeline, a small menu); never to frame a form or an editor. Zoom out before the pointer leaves it (see "Keep it plain"). |
| `w.unzoom()` | The camera eases back to the whole window. |
| `w.role(...)`, `w.text(...)` | `page.getByRole`, `page.getByText`. |
| `w.page` | The Playwright page, for anything else. |

A missing element never throws: the beat logs `missing` and the take goes on, so read the log.

## Lessons learned

Each of these cost a take once.

- **Names come from the probe.** A label you remember is often not the accessible name.
- **`exact: true`** whenever a name could be part of another: "Next" also matches "Go to the
  Next Month".
- **Layouts change with width.** At half width a sidebar folds, a list becomes a menu, controls
  hide. Probe at the recorded size, and do setup work at full width if needed
  (`w.page.setViewportSize(...)`, then back).
- **Escape does not close everything.** If a menu stays open, click an empty spot.
- **Type into fields with `pressSequentially`** (or `w.type`) when the app reacts to each key;
  `fill` can skip the app's handlers.
- **Native dialogs are dismissed automatically** and logged. If the flow needs one accepted,
  handle it in the beat.
- **Uploads and long saves stall.** Prefer hovering "Attach a file" to a real upload in a demo.
- **A take changes the data.** Undo what it adds in `cleanup` or `setup` (delete the task it
  created; remove the file it added) instead of resetting the database. Anything that cannot be
  undone (archiving, completing, sending, saving a permanent record) changes the next take too:
  plan around it, and write it in `context.md`.
- **The previous take's leftovers** can change what the next take shows (a comparison picks the
  last saved record). Set values on purpose and say so in a comment.
- **The screen must stay unlocked**, and nothing else should run heavy work during a take.
- **Two windows run their beats one after the other** unless you `Promise.all` them; do that when
  both should move at once.
- **Centre what the viewer must see.** If the app's own centring is off at a size, fix it in the
  take (a sideways scroll pans many canvases) and write the quirk in `context.md`.
