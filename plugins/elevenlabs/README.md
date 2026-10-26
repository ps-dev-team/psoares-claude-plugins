# elevenlabs

Voice-overs with ElevenLabs that sound like the speaker, with line and word timings.

One skill, `voice-generation`:

- eleven_v4 clones through text-to-dialogue, which keeps the speaker's accent
- script tags and punctuation for pacing; pronunciation fixes that never touch the script
- a pause cap per language, chosen by measuring and listening
- takes made on the ElevenLabs website, fetched from the history
- timings for any audio and a misread check with Scribe speech-to-text

Scripts in `lib/` (Python 3, no packages; ffmpeg for `analyze.py`): `generate.py`, `clean.py`,
`history.py`, `scribe.py`, `analyze.py`. The key lives in `~/.config/elevenlabs/.env` and is
never printed.

Works on its own. demo-studio's `audio` skill handles the audio edit (pause cap with
crossfades, loudness), and its `screen` skill can time a recording to the timings made here.

ElevenLabs is a paid service: generation is billed per character, speech-to-text per minute.

MIT license.
