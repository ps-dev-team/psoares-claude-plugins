# Voice generation: examples

## A word read in the wrong language

A Portuguese script says "IA" (artificial intelligence) and the voice reads it as English
letters. Keep "IA" in the script and add a fix:

```json
{ "IA": "i-á" }
```

```sh
python3 lib/generate.py lesson.md out/lesson --voice VOICE_ID --lang pt --fix fixes.json
python3 lib/scribe.py out/lesson.mp3 lesson.md out/lesson-check --lang pt
```

Scribe hears "IA" in Portuguese: the fix worked.

## The same voice in two languages

```sh
python3 lib/generate.py en/lesson.md out/en-lesson --voice VOICE_ID --lang en
python3 lib/generate.py pt/lesson.md out/pt-lesson --voice VOICE_ID --lang pt
python3 lib/analyze.py out/en-lesson.mp3 --lines out/en-lesson.lines.json
python3 lib/analyze.py out/pt-lesson.mp3 --lines out/pt-lesson.lines.json
```

If one language speaks noticeably faster (say 225 against 195 words per minute), give it a
longer pause cap after generation, then compare both caps in the finished video before
choosing.

## A take made on the website

```sh
python3 lib/history.py list --voice VOICE_ID --limit 6
python3 lib/history.py get HISTORY_ID_A takes/intro-a
python3 lib/history.py get HISTORY_ID_B takes/intro-b
```

Listen to both (v4 and v4_exp pace differently), keep one, then get its timings:

```sh
python3 lib/scribe.py takes/intro-a.mp3 intro.md out/intro --lang en
```
