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
   - **the pointer**, drawn from the recorded path: large (`pointer.size`, CSS pixels), black
     with a white edge and a soft shadow, squeezing a little on each press, always visible;
   - **the zooms** the beats asked for, eased with Screen Studio's spring
     (`mass 1, stiffness 169, damping 26`), never past the window's edges, with no motion blur by
     default. Remotion's CameraMotionBlur adds its samples in 8-bit and tints a pale background
     green while the camera moves; `camera.blur.samples` above 1 turns it back on.

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
  "pointer": { "mode": "drawn", "size": 34 },
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
