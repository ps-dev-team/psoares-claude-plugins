# psoares-video

Screen demos and B-roll for creators, made by Claude from a script or plain instructions:
product walkthroughs, course lessons, app demos, B-roll of a website. Claude drives a real
Chrome window like a person would, records it, and builds a polished video with a large
Screen Studio-style pointer, smooth zooms and an optional voice-over.

| Need | Skills |
|---|---|
| A demo of an app, with a voice-over | `voice` → `screen` → `assemble` |
| A demo timed to your own recording, or to the sound of your own video | `voice` (bring your own) → `screen` → `assemble` |
| A silent demo, or B-roll of a website | `screen` → `assemble` |
| A voice-over only | `voice` |
| B-roll of people from photos (optional, paid: Higgsfield) | `broll` |

## Install

```
/plugin marketplace add ps-dev-team/psoares-claude-plugins
/plugin install psoares-video@psoares-claude-plugins
```

**Needs:** Node 22+, pnpm, Python 3 with Pillow, ffmpeg, Google Chrome, and Playwright (in the
project, `pnpm add -D playwright`, or at `config.playwright`). Works on macOS, Linux and Windows;
finding faces in `broll` is macOS only (elsewhere you give the face's position).

**Optional:**
- a voice: an ElevenLabs account to generate one, or your own recording (timings from a local
  Whisper, free, or ElevenLabs Scribe);
- numpy, for shortening long pauses in a voice;
- Higgsfield (CLI and credits), only for `broll`;
- a cursor set exported from Screen Studio, for its exact pointer (a plain arrow is drawn
  otherwise).

## The skills

- **`voice`** (optional): the script, rules for a script that is easy to say, and the voice with
  the timing of every line and word. Generate it with ElevenLabs, or bring your own audio or
  video. Shortens long pauses so it moves naturally.
- **`screen`**: records real headed Chrome, one window or two side by side (an admin and a
  user), running **beats**: small steps timed to the words of the voice, or to seconds. It reads
  each page first, so every click targets a real button, and it shows what the script talks
  about. The pointer moves like a hand. The pointer's path and the zooms are saved as data.
- **`assemble`**: builds the video: the large drawn pointer with Screen Studio's spring, zooms,
  two windows in a plain browser frame, fades between scenes, the voice, 4K at 60 fps. A quick
  draft and a review page come first if you want them.
- **`broll`** (optional, paid): B-roll of people with Higgsfield: enlarged photos, the person in
  a real-life setting, talking and listening clips, loops and fake-camera feeds for a call.

Each skill has a `docs/` folder with an overview, a quick start and examples.

## A project

One folder per series of videos:

```
video.config.json   app, accounts, sizes, voice, frame (see config.example.json)
context.md          what the app is, for whoever writes beats (template in the screen skill)
scripts/<id>.md     scripts
audio/              voices and timings
videos/<id>.mjs     beats
raw/ build/ frame/  recordings, renders, frame layers
```

The scripts in `lib/` take the project folder as their first argument:

```sh
python3 lib/tts.py <project> <id>                          # generate a voice (ElevenLabs)
python3 lib/stt_lines.py <project> <id> --source take.wav  # or bring your own: timings
node lib/probe.mjs <project> <account|-> <url>             # look at a page
node lib/run.mjs <project> <id>                            # record (keeps the machine awake)
node lib/assemble.mjs <project> <id>                       # build
sh lib/sheet.sh <video> <sheet.jpg> 5 12 30                # contact sheet
```

`chrome` in `video.config.json` points at a Chrome of your own; without it, the installed Google
Chrome is found on macOS, Linux and Windows.

## License

MIT, see `LICENSE`. The camera step renders with [Remotion](https://www.remotion.dev), which has
its own license: free for individuals and small companies, a paid company license above that.
Check it before using this commercially in a larger company. Screen Studio's cursors are not
included; export your own set if you have the app.
