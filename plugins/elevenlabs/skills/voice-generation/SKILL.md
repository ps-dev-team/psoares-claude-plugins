---
name: voice-generation
description: Generate voice-overs with ElevenLabs that sound like the speaker, and get the timing of every line and word. Covers eleven_v4 voice clones (text-to-dialogue keeps the accent), script tags and punctuation for pacing, pronunciation fixes that never touch the script, a different pause cap per language, picking takes made on the ElevenLabs website, and checking a voice for misreads with Scribe speech-to-text. Use for "generate the voice for this script", "make the voice-over", "use my cloned voice", "the voice reads this word wrong", "get timings for this audio", "pick the take from the website", "the English voice sounds rushed". Script in, mp3 and line timings out.
---

# Voice generation

Script in, voice out: `name.mp3` and `name.lines.json`, where every spoken line has its start
and end, and every word its start. Screen recorders, editors and caption tools can time
things to that file.

Scripts here (`${CLAUDE_PLUGIN_ROOT}/lib`), all Python 3 with no packages to install:

| Script | Does |
| --- | --- |
| `generate.py` | script to mp3 plus line and word timings |
| `clean.py` | the copy of the script that is sent: comments and quotes out, pronunciation fixes in |
| `history.py` | list and download takes made on the ElevenLabs website |
| `scribe.py` | timings for any audio, and a list of every place the voice differs from the script |
| `analyze.py` | speaking speed, pauses and loudness (ffmpeg, no API call) |

## The key

The key is `ELEVENLABS_API_KEY`, in the environment or in `~/.config/elevenlabs/.env`. Never
ask for it in the chat, never print it, never put it on a command line. If it is missing,
give the user this to run themselves (they paste their key where it says PASTE):

```sh
mkdir -p ~/.config/elevenlabs && printf 'ELEVENLABS_API_KEY=%s\n' 'PASTE' > ~/.config/elevenlabs/.env && chmod 600 ~/.config/elevenlabs/.env
```

The key comes from the ElevenLabs site, under the profile's API keys. Speech-to-text and
history reads need their permissions on that key.

## The model and the endpoint

For a cloned voice use **eleven_v4** through **text-to-dialogue**, the endpoint the
ElevenLabs website uses. It honours the three website settings: `stability`, `similarity` and
`clone_strength` (all 1.0 is the closest to the speaker; clone strength applies to a
professional clone). Text-to-speech on v4 keeps stability alone and drops the other two, and
the read loses the speaker's accent. `generate.py` picks the endpoint from the model.

`--lang` forces the language (ISO 639-1: `en`, `pt`, `es`). The same clone can speak another
language: generate the second language with the same voice id and its own `--lang`.

## The script

Write it the way the speaker talks: one sentence per line, one breath each, plain words.

- **Tags.** One tag opens the script, describing the voice: `[warm]`. Then only two tags:
  `[pause]` where the subject changes, and `[short pause]` between items of the same subject.
  A tag on its own line steers what follows. Tags describe the voice, never a sound: v4 is
  also trained on sound effects, so `[door opens]` may be performed as a sound.
- **v4 performs pause tags loosely**, anywhere from about 0.4 to 1.5 seconds. Even them out
  after generation (see "Pauses per language"), not by adding more tags.
- **Punctuation is the main pacing lever.** A comma is a small breath, a full stop a real stop,
  an ellipsis (`…`) a longer, weighted pause, and a line break a natural stop.
- **CAPITALS** stress a word. Rarely, one word at a time.
- **Numbers and symbols as said:** "ten clients", "and" for "&".
- **The words are the speaker's.** To improve the delivery, change tags and punctuation, not
  the wording, unless the user asked for a rewrite.

`clean.py` makes the copy that is sent: it removes HTML comments (editor notes would be read
aloud) and quote marks (v4 can treat them as a change of voice), and tidies blank lines.
`generate.py` runs it for you.

## Pronunciation

When the voice says a word wrong (an acronym read in the wrong language, a brand name, a
borrowed word), fix the **sent copy**, never the script. Put the fix in a small JSON file and
pass it with `--fix`:

```json
{ "AI": "ay-eye", "IA": "i-á" }
```

Fixes match whole words only. Write the fix the way a speaker of that language would spell the
sound. Then check the result with `scribe.py`: if speech-to-text hears the word you meant, the
fix worked. Keep the fixes file beside the script so every later generation uses it.

## Test, then generate

- **A new voice, new settings or a new tag:** generate a few lines first (`--lines 1-4`) and let
  the user listen. It costs a fraction of the full script.
- **Long scripts:** generate in chunks (a section or a lesson at a time). Pacing stays more
  even than in one very long request, and a bad part is cheap to redo.
- **Cost:** you pay per character sent. `generate.py` prints the count. Say the total before a
  large batch.

```sh
L="${CLAUDE_PLUGIN_ROOT}/lib"
python3 $L/generate.py script.md out/intro --voice VOICE_ID --lang en --fix fixes.json --lines 1-4
python3 $L/generate.py script.md out/intro --voice VOICE_ID --lang en --fix fixes.json
```

## Check every generation

Run `scribe.py` on the result. It transcribes the audio, lines it up with the script, writes
the timings and lists every place the voice differs from the script, with the time to listen:

```sh
python3 $L/scribe.py out/intro.mp3 script.md out/intro-check --lang en
```

A match around 98 to 100% is normal (contractions, numbers). Listen to each listed spot: a
skipped word, a word in the wrong language, a tag read aloud. Fix with punctuation or a
pronunciation fix and regenerate that chunk.

## Pauses per language

Generated speech does not pace the same in every language. One clone, measured on the same
course in two languages: about 190 to 200 words per minute in Portuguese, about 225 in
English. The faster language needs a little more room between sentences.

1. Measure each language with `analyze.py` (speed, pauses, loudness).
2. Cap the pauses after generation, a different cap per language (for example 0.3 s for the
   slower language and 0.5 s for the faster one). Cut inside true silence with a short
   crossfade, so no cut is heard: demo-studio's `audio` skill does this (`tight.py`), and a
   plain hard cut can be audible on headphones.
3. **Decide by listening to a fair A/B in the final edit:** the same passage at each cap, in
   the real video. Comparing a new cap against a render made with the old one is biased.
4. Rebuild the timings after any cut (`scribe.py`): cut pauses move every word.

Loudness is a separate step: spoken video for the web sits at about -16 LUFS (YouTube's
reference is -14), with true peak at most -1 dBTP. Generated voices come out much quieter.
demo-studio's `audio` skill normalizes.

## Takes from the website

People often generate on the ElevenLabs website. On v4 it makes **two takes per generation**,
`eleven_v4` and `eleven_v4_exp`, and they pace differently. Fetch them from the history:

```sh
python3 $L/history.py list --voice VOICE_ID          # id, date, model, characters, start of the text
python3 $L/history.py get HISTORY_ID takes/intro-a     # takes/intro-a.mp3 and .txt (the text sent)
```

Let the user listen and pick. Website audio comes **without timings**: run `scribe.py` on the
chosen take against the script to get them. The history text shows exactly what was sent,
including any comments the website read aloud; check it when a take says something odd.

## What to tell the user

- Which model, endpoint and settings were used, and the character count.
- The `scribe.py` match and any spot worth listening to.
- Where the files are. Never play audio by opening it with a media app the user did not
  choose; reveal it in the file manager instead.
