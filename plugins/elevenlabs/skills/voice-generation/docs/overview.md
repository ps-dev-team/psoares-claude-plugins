# Voice generation: overview

Turn a script into a voice-over that sounds like a real person, usually the creator's own
cloned voice, with the time of every line and word.

## What it is for

- Voice-overs for demos, tutorials, courses and explainers.
- The same voice in a second language.
- Timings for audio made elsewhere (the ElevenLabs website, an edited file), so a screen
  recording or an editor can follow the words.

## What it does

- Generates with ElevenLabs eleven_v4 through the endpoint that keeps a clone's accent.
- Sends a cleaned copy of the script: editor notes and quote marks out, pronunciation fixes in.
  The script itself never changes.
- Fetches the two takes the website makes per generation, so you can pick one.
- Checks a voice against the script with Scribe speech-to-text and lists every spot to hear.
- Measures speaking speed, pauses and loudness, to choose a pause cap per language.

## What it needs

- An ElevenLabs account and API key, kept in `~/.config/elevenlabs/.env`.
- Python 3. ffmpeg for `analyze.py`.

## What it does not do

- Edit the audio. Capping pauses with crossfades and loudness normalization live in
  demo-studio's `audio` skill.
- Write the script for you. It applies script rules (one sentence per line, tags, punctuation)
  to the words you or your writer chose.
