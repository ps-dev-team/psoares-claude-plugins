---
name: assemble
description: Turn screen recordings (and an optional voice) into the finished video: a large Screen Studio-style pointer, 2x spring zooms, two windows side by side in a plain browser frame, fades between scenes, the voice with its gaps, 4K at 60 fps. Use after the screen skill: "assemble the video", "render lesson 9", "put the voice on it", "make the B-roll clip", "monta o vídeo". Also re-renders after a change to the frame, the pointer or the zooms, without recording again.
---

# Assemble

Recordings in, `build/<id>.mp4` out. Offer the user a draft review before the full render (see
"Draft and review"); it is optional.

```sh
node "${CLAUDE_PLUGIN_ROOT}/lib/assemble.mjs" <project> <id> --draft   # build/<id>.draft.mp4
node "${CLAUDE_PLUGIN_ROOT}/lib/assemble.mjs" <project> <id>           # build/<id>.mp4
```

Run it in the background; a voiced two-window lesson takes several minutes per window. It is a
heavy job: nothing else heavy at the same time.

## What it does

1. **Each window's clip** is redrawn by the camera (Remotion, installed once into
   `~/.cache/demo-studio/camera`):
   - the picture from the recorded frames;
   - **the pointer**, large (`pointer.size`, CSS pixels) and always visible. It follows the
     recorded path on the same spring as the camera, so it glides instead of stepping, and leans
     a little with horizontal speed. Its shape is the one recorded with each move (arrow,
     I-beam, open hand, resize, not-allowed), the pointing hand only around a click and a
     closed hand while the button is held; it squeezes a little on each press;
   - **the cursor set** comes from `pointer.cursors`, a folder of SVGs named
     `<shape>-1__<x>-<y>.svg` with the hot spot in percent: Screen Studio's own format, so a set
     can be copied out of its app (`app.asar`, `assets/cursors/sets/<set>/`) with
     `npx @electron/asar extract-file`. The default looks in
     `~/.config/demo-studio/cursors/macos-tahoe` (and the old `~/.config/psoares-video/…`). Keep a set in the user's own folders, not in
     this plugin: the images belong to Screen Studio and Apple. Without a set, a plain arrow and
     hand are drawn;
   - **the zooms** the beats asked for, never past the window's edges. Both springs are Screen
     Studio's as it plays on screen, measured from its exports: `mass 1, stiffness 169,
     damping 26`, critically damped. Its project file says `mass 1.5, stiffness 125, damping 12`
     with a clamp, but in Remotion those numbers bounce and the clamp cuts the bounce into steps
     (the user saw the zoom "flaky"). No motion blur by default: Remotion's CameraMotionBlur adds
     its samples in 8-bit and tints a pale background green while the camera moves;
     `camera.blur.samples` above 1 turns it back on.

   With `pointer.mode: "page"` the pointer was drawn in the page during the take; the camera
   step is skipped and the frames are used as they are (faster, no zoom).
2. **The layout.** One window fills the frame edge to edge. Two windows sit side by side in a
   plain browser frame: three grey dots, an address pill (`frame.address`), rounded corners, a
   soft shadow, `frame.gap` between them, on `frame.stage`. It copies no real browser. The
   layers are drawn once into `frame/`; delete `frame/` after changing the frame settings.
3. **Segments** are joined with a fade (`transition.kind`, default a fade through white).
4. **The voice** goes under, with the silence of every `gap` cut into the real pause before its
   line, with short fades so no sound leaks. Without a voice the video is silent B-roll.

## Settings (video.config.json)

```json
{
  "output": { "width": 3840, "height": 2160, "fps": 60, "crf": 17 },
  "frame": { "address": "app.example.com", "stage": "#f5f6fc", "gap": 40, "single": false },
  "pointer": { "mode": "drawn", "size": 34, "cursors": "~/.config/demo-studio/cursors/macos-tahoe" },
  "camera": { "zoom": 2, "concurrency": 4, "blur": { "shutter": 180, "samples": 0 } },
  "transition": { "kind": "fadewhite", "seconds": 0.7, "pad": 0.5 },
  "audio": { "loudness": -16 }
}
```

`audio.loudness` is the level the full render ends at, in LUFS: -16 for speech on the web and in
apps, -14 for YouTube, `false` to keep the mix as it is. The picture is not touched; the report
lists the loudness before and after. See the audio skill.

`frame.single: true` puts a single window in the frame too. `camera.concurrency` is how many
frames Remotion renders at once; keep it modest on a laptop.

## Live preview

Once a video is recorded, the review page (`node lib/review.mjs <project> <id>`) can play it with
**no render at all**: the recordings are put together in the browser by Remotion's Player, on the
same camera, pointer, cursor set, zooms, frame, fades and voice (with its gaps) the render uses,
from the same inputs (`lib/parts.mjs`), so what plays is what the render will be. A recorded
video with no render opens in the live preview; with a render, the Render / Live switch in the
header picks one, and the label says which plays ("Live preview", "Draft render", "Full
render"). Comments, stills and the timeline work the same in both. Camera motion blur is not
drawn live. The first live preview builds a small bundle in the camera's cache folder.

## Draft and review

A draft lets the user comment before the full render, so a change costs a minute, not a 4K
render. It is an offer, never a gate: ask whether they want to review a draft first. If they say
no, or ask for the final, render it directly.

1. Render the draft (`--draft`): a third of the size, no motion blur, a fast encode, with the same
   pointer, zooms, pauses and voice. It also writes `build/<id>.draft.timeline.json` (scenes,
   script lines, pauses, zooms, gestures, clicks and warnings, in video seconds).
2. Open the review page for the user, and a waiter beside it, both in the background (127.0.0.1
   only; `PORT=<n>` keeps the same address across restarts, `NO_OPEN=1` skips opening the
   browser):

   ```sh
   node "${CLAUDE_PLUGIN_ROOT}/lib/review.mjs" <project> [id]   # the page, opened on <id>
   node "${CLAUDE_PLUGIN_ROOT}/lib/review.mjs" <project> --wait # exits on the next Send, any video
   ```

   One server serves the whole project. The list on the left holds every video (beats file or
   voice) with its state (beats, voice, plan, draft, final), its length and its comments;
   `/?v=<id>` opens one, so a link to a video can be given. The user plays the draft over the
   timeline, pauses where something should change and presses C. Each comment is pinned to its
   moment and saved to `review/<id>.json`, with a still of the frame in `review/<id>-<n>.jpg`.
   **Send to Claude** marks the open comments `sent`; the waiter prints them and exits, which
   wakes you. Restart the waiter after each send. The page itself needs a restart only when
   `review.mjs` changes; the HTML and the data reload on their own.

   **Stop the server and the waiter when the review is done** (the user approves, or moves on
   to something else): stop the background tasks you started, by their id or PID, never by name.
   Never leave one running at the end of the work. As a safety net the server stops itself
   after 30 minutes with no page open (`IDLE_MIN`).
3. Read the comments sent and look at each still. For each `sent` comment, change the beats (or
   say why not), then set its `status` to `done` (or `answered` when the answer is words only)
   and write a short `reply`. Never delete a comment. Re-record what changed, render a new
   draft: the page reloads it. Answered comments leave the Open tab and the timeline and sit
   under Done with their reply; the user can Reopen one.
4. **Approve** in the page's header records the user's approval of the version on screen
   (`approved` in `review/<id>.json`, every change in `approvals`) and wakes the waiter
   (`review <id>: APPROVED`). An approval belongs to that render: after a newer one the list shows
   it as given to an older version. An approved draft is the order to render the full video and
   hand it over (below). An approval said in the chat counts the same: record it with
   `POST /approve?v=<id>` so the list shows it.

A re-render keeps the report's Decisions; only the facts above them are rewritten.

## Check, then hand over

Make a contact sheet and look at it before saying it is done:

```sh
sh "${CLAUDE_PLUGIN_ROOT}/lib/sheet.sh" <project>/build/<id>.mp4 <project>/build/<id>-sheet.jpg 3 10 22 35 48
```

Look for: the pointer where the action is, zooms landing on their target and easing back,
nothing cut off at a window's edge, the fade at each scene change, and the last frame held to
the end of the voice. Then copy the video where the user keeps finished ones, and say where.

## The report

Every video is handed over with its report, `build/<id>.report.md`, copied beside the video. It
lets the user, who has already heard the voice, see what changed and where to look without
watching the whole video. Keep it short, and give every item its time in the finished video
(`m:ss.s`), so the user can jump straight to it.

The assembler writes the facts:

- **The voice:** every pause added (where, how long, before which line) and nothing else; or that
  the voice is untouched.
- **Needs a look:** what went wrong on the take: beats that ran late or slow, an element that was
  missing, a beat that failed, and the zoom warnings (a zoom on a large area, a second zoom, a
  zoom moved or repeated). Fix those, or give the reason in the Decisions.

Before handing over, add the **Decisions** by hand: what you chose that the script did not say,
and anything the user may not like. For example:

- a pause added or lengthened, and why (a dialog needed time to open);
- a gesture used (a loop around an area, a selection box, a text selection) and on what;
- a zoom added or left out;
- a step shown differently from the script, or left out, and why;
- data on screen that looks odd (a stray test record, a wrong date, a banner);
- anything you were unsure of.

Lead with what most needs the user's eye. If nothing does, say so in one line. When handing over,
paste the report's Decisions and Needs a look into the reply, not only the file path.
