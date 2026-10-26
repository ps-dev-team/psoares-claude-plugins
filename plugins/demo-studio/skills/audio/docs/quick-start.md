# Audio: quick start

How loud and how fast is it?

```sh
python3 lib/audio_report.py build/demo.mp4 --lines audio/timings/demo.lines.json
```

Make it as loud as other videos on the web (keeps `demo.pre-norm.mp4`):

```sh
python3 lib/normalize.py build/demo.mp4            # -16 LUFS
python3 lib/normalize.py build/demo.mp4 --youtube  # -14 LUFS
```

Shorten long pauses in a voice before recording the screen:

```sh
python3 -m venv .venv && .venv/bin/pip install numpy
.venv/bin/python lib/tight.py audio/demo.mp3 audio/demo.tight.mp3 --max 0.4
```
