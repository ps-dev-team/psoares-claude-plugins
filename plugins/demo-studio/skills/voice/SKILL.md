---
name: voice
description: The voice of a screen video, and the timing of every line and word that the screen skill follows. Optional. Three ways in: generate it from a script with ElevenLabs (eleven_v4, your own cloned voice or any voice), bring your own recording or any other TTS, or take the audio from a video of your own. Also shortens long pauses so a voice-over moves naturally. Use for "generate the voice for this script", "read this with my voice", "I recorded the voice-over myself", "use the audio from my video", "time the demo to this audio", "the pauses are too long", "gera a voz deste guião". The output is an MP3 plus timings; nothing here knows what will be on screen.
---

# Voice

Script in, voice out: `audio/<id>.mp3` and `audio/timings/<id>.lines.json`, where every spoken
line has its start and end, and every word its start. The screen skill uses those times to
click on the word the voice is saying.

**A voice is optional.** A silent demo or B-roll of a website needs none: the screen skill then
times its beats in seconds.

## The project

Work in a video project folder (see the plugin README): `video.config.json`, `scripts/<id>.md`
for the script, `audio/` for the voice and its timings.

## 1. The script

One sentence per line, one breath per line (about 15 words at most), a blank line between lines,
in the speaker's own words. Write it as people talk: "I'll show you", "let's open", contractions,
short common words. Numbers and symbols as they are said ("ten tasks", "and" for "&"). A line
that names a few things can name them in one sentence. The words on the page are exactly the
words said: no stage directions in the text.

- **Directions** go in `[square brackets]` on their own line, or opening a line; lines that
  start with `[` are not spoken and not counted. HTML comments (`<!-- … -->`) are notes for the
  editor and are never read aloud.
- **The words are the speaker's.** When improving delivery, change punctuation and directions,
  not the wording, unless the user asked for a rewrite.
- The first line is usually the intro and the last lines the ending; keep them as their own
  lines, so an editor can cut or replace them.

## 2a. Generate it with ElevenLabs

Needs an ElevenLabs account and a voice: `voice.id` in `video.config.json`, and optionally
`voice.model` (default `eleven_v4`), `voice.settings` and `voice.language` (ISO 639-1).

- On v4, `voice.settings` takes the website's three: `stability`, `similarity` and
  `clone_strength` (0 to 1; clone strength only for a professional clone). `tts.py` sends v4
  through text-to-dialogue, the endpoint the website uses, because text-to-speech drops
  similarity and clone strength on v4 and the read loses the speaker's accent. Other models go
  through text-to-speech with `similarity_boost`, `style`, `use_speaker_boost` and `speed`.
- The key is `ELEVENLABS_API_KEY`, from the environment or `~/.config/elevenlabs/.env`. Never
  ask for it in the chat and never print it. If it is missing, give the user this to run
  themselves: `! mkdir -p ~/.config/elevenlabs && printf 'ELEVENLABS_API_KEY=%s\n' 'PASTE' > ~/.config/elevenlabs/.env`

Directions for eleven_v4 are audio tags:

- **Tags describe the voice, never a sound.** v4 is also trained on sound effects, so
  `[door opens]` may be performed as a sound. Write how the voice sounds: `[warm]`,
  `[conversational]`, `[slightly slower, informative]`, `[reassuring]`, `[curious]`.
- **Few tags.** A warm opening tag, then `[pause]` to change subject and `[short pause]` between
  items is plenty. Too many pauses make the read slow and mechanical.
- An ellipsis (`…`) adds a beat; a line break is a natural stop. No SSML `<break>` on v4.
  CAPITALS stress a word: rarely, one word at a time.

For a new voice or new tags, generate a short test first (three or four lines) and let the user
listen. Then the full script:

```sh
python3 "${CLAUDE_PLUGIN_ROOT}/lib/tts.py" <project> <id>
```

It prints every line with its start time; the line numbers (from 0) are what beats refer to.
One request per script: split a very long one into parts (`<id>-a`, `<id>-b`) at a paragraph
break.

## 2b. Bring your own voice

A recording from your mic, another TTS, a voice made on a website, or the sound of a video of
your own. `stt_lines.py` gets the timings by speech-to-text and lines the words up against the
script:

```sh
python3 "${CLAUDE_PLUGIN_ROOT}/lib/stt_lines.py" <project> <id> --source my-take.wav --lang en
python3 "${CLAUDE_PLUGIN_ROOT}/lib/stt_lines.py" <project> <id> --source my-video.mp4     # takes the audio out
```

- `--source` can be any audio or video file; it becomes `audio/<id>.mp3`. Without it, the
  script reads `audio/<id>.mp3`.
- **No script?** The transcript becomes one: one sentence per line, written to
  `scripts/<id>.md`.
- **Backends:** a local Whisper when one is installed (`pip install openai-whisper` or
  `faster-whisper`; free, set `WHISPER_MODEL` for a bigger model), else ElevenLabs Scribe
  (paid, the same key as above). Force one with `--backend whisper|scribe`.
- It prints how many words matched. Under 90% means the audio and the script differ: fix the
  script, or delete it to use the transcript.

## 3. Shorter pauses (optional)

Long silences between lines make a voice-over sound mechanical. `tight.py` shortens every pause
longer than `--max` (0.3 s by default) to that length, cutting in the middle of the silence with a
short crossfade, so no cut is heard. How to choose the cap (0.3 s for a calm voice, 0.5 s for a
fast one) and how to measure the result are in the audio skill:

```sh
python3 -m venv .venv && .venv/bin/pip install numpy        # once
.venv/bin/python "${CLAUDE_PLUGIN_ROOT}/lib/tight.py" <project> <id> [--max 0.3]
python3 "${CLAUDE_PLUGIN_ROOT}/lib/stt_lines.py" <project> <id>   # new timings
```

The first run keeps the original as `audio/<id>.orig.mp3`. Do it before recording: the beats
follow the timings, so a recording made on the old timings is out of step.

## 4. Hand over

Tell the user where the MP3 is and how long it runs. Changing the voice changes the timing of
everything after the change: beats keyed to words (`L(12, 'compare')`) follow it, beats keyed to
raw seconds do not, and anything already recorded must be recorded again.
