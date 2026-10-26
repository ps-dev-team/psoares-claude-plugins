# Audio: examples

**"Our videos sound quieter than everything else."** Run the report on two or three of them. A
reading around -26 LUFS against the usual -14 to -16 means about 10 dB too quiet. Normalize each
file to -16 (or -14 for YouTube); the picture is copied, so it takes seconds per video.

**"The English version feels rushed, the other one doesn't."** Run the report with `--lines` on
both voices. If one speaks at 225 words per minute and the other at 195, the fast one needs more
room: cap its pauses at 0.5 s instead of 0.3 s, and compare the two on the same 40 seconds.

**"Did the render come out at the right level?"** The assemble report lists the loudness before
and after. To check any file by hand, `audio_report.py file.mp4`.
