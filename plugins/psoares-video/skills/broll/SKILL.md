---
name: broll
description: Make B-roll with Higgsfield from photos of people: an enlarged photo, the person placed in a real-life setting, short clips of them talking or listening, and from those clips seamless loops, overlay clips, or fake-camera feeds for a recorded video call (talking when they speak, listening otherwise). Use for any "make B-roll of these people", "generate clips of the users", "replace the faces in the call", "fake webcam for the demo", "gera B-roll com o Higgsfield". Never a talking-head presenter or a spokesperson video: the people are background, seen in a call tile or behind the subject.
---

# B-roll

Photos in, footage out. Every paid step is priced first and logged, and nothing is spent past
the balance. The `screen` skill plays the feeds as a fake camera; `assemble` takes the clips as
overlays.

## Before anything

- **The CLI.** `higgsfield account status` shows the plan and credits. Not signed in: the user
  runs `! higgsfield auth login` themselves.
- **Spending.** Credits are the user's money. Ask before the first generation of a job and give
  the total ("4 upscales, 4 scenes, 8 clips: about 96 credits of 122"). Approval covers that
  plan; a retry beyond it, a new model or a bigger size is a new question.
- **Check every flag.** `higgsfield model get <job_type>` lists a model's parameters, and
  `higgsfield <command> --help` the CLI's. Do not guess a flag. In zsh, a string of arguments in
  a variable must be split with `${=args}`.
- **Look at every result** before the next step. A face that is not the person, a frame inside
  the picture, a warped hand: fix it (a crop) or redo that one item, once.

## The folder

```
faces/                     or broll/, in the video project
  src/<who>.png            the photos as found
  big/<who>.png            enlarged
  scene/<who>.png          the person in their setting (and ids.txt: uploaded media ids)
  clips/<who>-<kind>.mp4   talking, listening
  timeline/                speaker timelines, when the clips follow a conversation
  CREDITS.md               every spend: job, output, credits, balance after
  README.md                what was made, the prompts, how to redo it
```

## 1. Photos

Find the photos the project already has before asking for any: the people's avatars in seed
data or fixtures (often data URLs: decode them), a design file, a folder the user names. Keep
them as found in `src/`.

## 2. Generate

`lib/hf.py` runs one generation: it prices it with `higgsfield generate cost`, refuses above
`--max` or the balance, creates it with `--wait --json`, downloads the result and adds a row to
`CREDITS.md`.

```sh
H="${CLAUDE_PLUGIN_ROOT}/lib/hf.py"
python3 $H big/ana.png bytedance_image_upscale --image src/ana.png --resolution 2k --max 3
python3 $H scene/ana.png nano_banana_2 --image big/ana.png --aspect_ratio 16:9 --resolution 2k --max 3 --prompt "…"
python3 $H clips/ana-listen.mp4 kling4_0 --mode image-to-video --start-image <media id> --resolution 1080p --duration 10 --max 11 --prompt "…"
```

- **Upscale** (`bytedance_image_upscale`, 2k, about 2 credits): an avatar is often 160 px, too
  small to keep a face through the next steps.
- **Scene** (`nano_banana_2`, 16:9, 2k, the enlarged photo as reference, about 2 credits).
  - **Real life by default.** An ordinary home or workplace someone really takes a call from:
    natural light, everyday objects, a lived-in room, a laptop webcam at eye height. Never a
    glossy studio, a cinematic grade or an advertising look, unless the user asks.
  - **Centred.** Head and shoulders, the person dead centre with equal space on both sides,
    looking into the camera.
  - **The same person.** Say so in the prompt: "Keep this exact person: same face, same
    features, same hair, same age".
  - One setting per person, so the people never look like they share a room.
- **Clips** (`kling4_0`, image-to-video, 1080p, 10 s, about 10 credits each). Two per person:
  - **listening**: looking into the camera, mouth closed the whole time, small nods, blinking,
    breathing. It doubles as the camera preview before a call: someone waiting, not talking.
  - **talking**: ordinary speech, small head movements, an occasional gesture low in the frame.
  Both say "the camera stays completely still: same framing, same room, same light" and
  "realistic laptop webcam footage, not cinematic". The mouth moves like speech but does not
  follow any words: fine for a small tile, wrong for a close-up.
- **Upload once.** Pass a start image as a media id (`higgsfield upload create <file> --json`)
  instead of a path: a large image uploaded with every request can time out.
- **"request failed (no response received)"** usually means nothing was sent: check
  `higgsfield account transactions --size 3` before trying again, so nothing is paid twice.

## 3. Outputs

**Centre every crop on the face.** A crop at a fixed half or ratio puts the person off centre.
`lib/face.swift` finds the face with macOS Vision (`swift face.swift <image>` prints its centre
and size as fractions), and every crop below is placed around it. Check a frame of each output
the same way: the face's centre within a few percent of the middle.

### A fake camera that follows a conversation

`lib/feed.py` makes the y4m file Chrome plays as a camera (`--use-file-for-fake-video-capture`,
the `media.video` of an account in `video.config.json`):

```sh
python3 "${CLAUDE_PLUGIN_ROOT}/lib/feed.py" --listen clips/ana-listen.mp4 --talk clips/ana-talk.mp4 \
  --speakers timeline/call.speakers.json --who client --hold 6 \
  --size 960x540 --fps 20 --dur 81 --out assets/09-ana.y4m
```

- **The speaker timeline** says who speaks when in the call audio the fake microphone plays: a
  list of `{who, start, end}`. Get it by forced alignment of that audio against the call script
  (ElevenLabs `/v1/forced-alignment`, the characters mapped back to the lines).
- The person **talks inside their segments and listens otherwise**, with a short crossfade at
  each change, and the clips are made seamless loops first, so nothing jumps.
- **`--hold`** keeps the first seconds listening: Chrome starts the file when the page opens the
  camera, so the start of the feed is the camera preview before joining.
- **`--dur`** is the length of the fake audio, so camera and microphone loop in step.
- y4m is raw: 960x540 at 20 fps is about 0.8 MB a frame, a gigabyte a minute. Keep the size
  the call tile needs.

### Loops and overlays

A plain loop: `feed.py --listen <clip> --dur <seconds> --size <WxH> --out x.y4m`, then convert
to mp4 if the target is a video editor. For an overlay in `assemble`, crop around the face at
the size the overlay needs and keep the clip short.

## 4. Report

`README.md` in the folder: the people and settings, the prompts, the credits (from
`CREDITS.md`), each output with its size, length and speaker segments, anything redone and why.
Tell the user the total spent and what is left.
