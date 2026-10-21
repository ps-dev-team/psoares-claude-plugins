---
name: assemble
description: Turn screen recordings (and an optional voice) into the finished video: a large Screen Studio-style pointer, 2x spring zooms, two windows side by side in a plain browser frame, fades between scenes, the voice with its gaps, 4K at 60 fps. Use after the screen skill: "assemble the video", "render lesson 9", "put the voice on it", "make the B-roll clip", "monta o vídeo". Also re-renders after a change to the frame, the pointer or the zooms, without recording again.
---

# Assemble

Recordings in, `build/<id>.mp4` out.

```sh
node "${CLAUDE_PLUGIN_ROOT}/lib/assemble.mjs" <project> <id>
```

Run it in the background; a voiced two-window lesson takes several minutes per window. It is a
heavy job: nothing else heavy at the same time.

## What it does

1. **Each window's clip** is redrawn by the camera (Remotion, installed once into
   `~/.cache/psoares-video/camera`):
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
     `~/.config/psoares-video/cursors/macos-tahoe`. Keep a set in the user's own folders, not in
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
  "pointer": { "mode": "drawn", "size": 34, "cursors": "~/.config/psoares-video/cursors/macos-tahoe" },
  "camera": { "zoom": 2, "concurrency": 4, "blur": { "shutter": 180, "samples": 0 } },
  "transition": { "kind": "fadewhite", "seconds": 0.7, "pad": 0.5 }
}
```

`frame.single: true` puts a single window in the frame too. `camera.concurrency` is how many
frames Remotion renders at once; keep it modest on a laptop.

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
  missing, a beat that failed.

Before handing over, add the **Decisions** by hand: what you chose that the script did not say,
and anything the user may not like. For example:

- a pause added or lengthened, and why (a dialog needed time to open);
- a gesture used (a loop around an area, a selection box, a text selection) and on what;
- a zoom added or left out;
- a step shown differently from the script, or left out, and why;
- data on screen that looks odd (a stray test client, a wrong date, a banner);
- anything you were unsure of.

Lead with what most needs the user's eye. If nothing does, say so in one line. When handing over,
paste the report's Decisions and Needs a look into the reply, not only the file path.
