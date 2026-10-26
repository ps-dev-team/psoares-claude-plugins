# Voice: quick start

**Generate (ElevenLabs):** put `voice.id` in `video.config.json`, the key in
`~/.config/elevenlabs/.env`, the script in `scripts/demo.md`, then:

```sh
python3 lib/tts.py <project> demo
```

**Bring your own audio or video:**

```sh
pip install openai-whisper                        # free, local; or use --backend scribe
python3 lib/stt_lines.py <project> demo --source my-take.m4a --lang en
```

No script yet? Leave it out: the transcript becomes `scripts/demo.md`.

**Shorter pauses:**

```sh
python3 -m venv .venv && .venv/bin/pip install numpy
.venv/bin/python lib/tight.py <project> demo
python3 lib/stt_lines.py <project> demo
```
