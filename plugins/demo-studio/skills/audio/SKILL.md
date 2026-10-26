---
name: audio
description: Check and fix how a voice-over or a finished video sounds. Reports loudness (LUFS), true peak, loudness range, pauses and speech rate; brings a file to a standard loudness (-16 LUFS for speech on the web, -14 for YouTube) with the picture untouched; shortens long pauses with crossfades. Use for "is the audio normalized", "how loud is this video", "it's too quiet", "match YouTube loudness", "the pauses are too long", "it sounds rushed", "how fast does the voice speak", "normaliza o som". Works on any audio or video file; the assemble skill runs the loudness step on every full render.
---

# Audio

Numbers first, then a fix. Three tools, all local (ffmpeg), nothing paid.

```sh
python3 "${CLAUDE_PLUGIN_ROOT}/lib/audio_report.py" <file> [more files] [--lines timings.lines.json] [--json]
python3 "${CLAUDE_PLUGIN_ROOT}/lib/normalize.py" <in> [<out>] [--target -16 | --youtube] [--peak -1.5]
.venv/bin/python "${CLAUDE_PLUGIN_ROOT}/lib/tight.py" <in> <out> [--max 0.3]
```

## 1. Analyze

`audio_report.py` gives, for each file:

| Column | What it is | Aim for |
|---|---|---|
| LUFS | integrated loudness over the whole file | -16 (speech on the web, apps, podcasts) or -14 (YouTube) |
| peak dBTP | true peak, between samples | -1 or lower, so lossy encoding does not clip |
| LRA | loudness range | 2 to 8 LU for a voice-over |
| pauses, silence, longest | silences below -50 dB, at least 0.2 s | longest about 0.3 to 0.5 s for a moving voice-over |
| wpm | words per minute while speaking (needs `--lines`) | 150 to 190 reads as calm; above 210 feels rushed |

Several files in one call give one table, handy for comparing versions or two languages.

## 2. Normalize

`normalize.py` measures, then applies one linear gain (two-pass EBU R128) to reach the target,
with a true-peak limit. A video stream is copied as it is; only the audio is written again (AAC
192 kbit/s, 48 kHz, faststart). Without `<out>` the file is replaced and the original kept as
`<name>.pre-norm.<ext>`. It takes seconds per file, so it is fine to run on finished videos.

What the targets mean:

- **-14 LUFS** is YouTube's reference. YouTube, Spotify and the like only turn loud files down,
  never quiet ones up, so a quiet video stays quiet next to everything else.
- **-16 LUFS** is the usual level for speech on the web and for podcasts. Players inside apps
  (Mux, a plain `<video>` tag) do not normalize at all: what you export is what people hear.
- **True peak at -1.5 dBTP** leaves room for the lossy encoding the platform applies; peaks
  closer to 0 can clip after encoding.

The assemble skill runs this at the end of every full render (`audio.loudness`, -16 by default;
`false` turns it off). Drafts skip it.

## 3. Pauses

`tight.py` shortens every silence longer than `--max` to `--max`, cutting in the middle of the
silence with an equal-power crossfade, so no cut is heard. Run it on the voice before recording
the screen: the beats follow the voice's timings, so rebuild them afterwards with
`stt_lines.py` (voice skill).

Choose the cap by ear and by language. Voices differ:

- **0.3 s** keeps a calm, slower voice moving.
- **0.5 s** suits a voice that already speaks fast: a tighter cap leaves no room to breathe and
  sounds rushed.

Compare two caps on the same 40 seconds before deciding, and check `wpm` with the report. The
cap is set per project or per language, not per line.

Needs numpy: `python3 -m venv .venv && .venv/bin/pip install numpy`.

## Hand over

Give the user the before and after numbers, in a small table, and where the files are.
