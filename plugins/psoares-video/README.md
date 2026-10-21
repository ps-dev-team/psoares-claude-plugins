# psoares-video

Voiced screen demos and B-roll, made from a script: course lessons, product walkthroughs, demo
clips. Three skills that work alone or in a row.

| Need | Skills |
|---|---|
| A voiced demo of an app | `voice` → `screen` → `assemble` |
| B-roll of a website or app | `screen` → `assemble` |
| A voice-over only | `voice` |

## Install

```
/plugin marketplace add ps-dev-team/psoares-claude-plugins
/plugin install psoares-video@psoares-claude-plugins
```

Needs: Node 22+, pnpm, Python 3 with Pillow, ffmpeg, Google Chrome, Playwright (in the project,
or at `config.playwright`), and an ElevenLabs key in `~/.config/elevenlabs/.env` for the voice.

## Skills

### `voice`

Writes or tightens the script (one line per take, with the `video-script` rules from
psoares-teleprompter and ElevenLabs' eleven_v4 guidance: tags that describe the voice, ellipses
for pauses, no SSML) and reads it with your ElevenLabs voice. Gives the MP3 and the timing of
every line and every word.

### `screen`

Records real headed Chrome, one or two windows (two accounts side by side, signed in from copied
cookies), running **beats**: small steps timed to the words of the voice, or to seconds for
B-roll. It probes each page first, so every click targets a real button name. It shows what
the script talks about (the print preview, the email, the dialog) without being told to open
it. The pointer's path and the zooms are saved as data.

### `assemble`

Builds the video: the pointer drawn large and sharp like Screen Studio's, 2× zooms eased with
Screen Studio's spring, two windows in a plain browser frame,
fades between scenes, the voice with silence cut in where the screen needed time, 4K at 60 fps.

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
python3 lib/tts.py <project> <id>                  # voice
node lib/probe.mjs <project> <account> <url>       # look at a page
caffeinate -i node lib/run.mjs <project> <id>      # record
node lib/assemble.mjs <project> <id>               # build
sh lib/sheet.sh <video> <sheet.jpg> 5 12 30        # contact sheet
```
