---
name: voice
description: Write or tighten a script for a voiced video and generate the voice with ElevenLabs (eleven_v4), with the timing of every line and word. Use for any voice-over, alone or as the first step of a screen demo: "generate the voice for this script", "read this with my voice", "make the audio for lesson 9", "voice-over for this video", "gera a voz deste guião". Works with no app and no screen: the output is an MP3 plus timings that the screen and assemble skills can follow.
---

# Voice

Script in, voice out: `audio/<id>.mp3` and `audio/<id>.lines.json`, where every spoken line has
its start and end, and every word its start. Nothing here knows what will be on screen.

## The project

Work in a video project folder (see the plugin README). This skill needs:

- `video.config.json` with `voice.id` (and optionally `voice.model`, `voice.settings`).
- `scripts/<id>.md`, the script.
- The key in `~/.config/elevenlabs/.env` as `ELEVENLABS_API_KEY=…`. Never ask for the key in
  the chat and never print it. If it is missing, give the user this to run themselves:
  `! mkdir -p ~/.config/elevenlabs && printf 'ELEVENLABS_API_KEY=%s\n' 'PASTE' > ~/.config/elevenlabs/.env`

## 1. The script

Load `psoares-teleprompter:video-script` and follow it: one sentence per line, one breath, the
speaker's warm voice, easy to say. Then these rules, for a script a voice model reads:

- **Plain text.** The only markup is ElevenLabs audio tags in `[square brackets]`. No Markdown,
  no headings, no lists with dashes (write a list as a spoken sentence).
- **A tag on its own line steers the lines after it.** A tag can also open a line:
  `[warm, clear] Let's open the session.`
- **Tags describe the voice, never a sound.** eleven_v4 is also trained on sound effects, so
  `[door opens]` or `[applause]` may be performed as a sound. Write how the voice sounds:
  `[warm, clear]`, `[conversational]`, `[slightly slower, informative]`, `[reassuring]`,
  `[emphasizing, confident]`, `[relaxed]`, `[curious]`.
- **Tags fit the voice.** A calm guide does not shout or giggle. A tag the voice was never
  trained on may be ignored, or come out odd: test new tags on the real voice first.
- **Pauses:** an ellipsis (`…`) adds a beat and weight; a line break is a natural stop.
  eleven_v4 does not support SSML `<break>`. A long pause for the picture is not written in the
  script: the screen skill adds it as a gap.
- **Stress:** CAPITALS stress a word. Use them rarely, one word at a time.
- **Write numbers and symbols as said:** "ten clients", "and" for "&".
- **The words are the speaker's.** When improving delivery, change tags and punctuation, not
  the wording, unless the user asked for a rewrite.

The first line is usually the intro and the last lines the ending; keep them as their own lines,
so an editor can cut or replace them.

## 2. Test, then generate

For a new voice or new tags, generate a short test first (a copy of the script with three or
four lines) and let the user listen. Then the full script:

```sh
python3 "${CLAUDE_PLUGIN_ROOT}/lib/tts.py" <project> <id>
```

It prints every line with its start time. Lines starting with `[` alone are directions and are
not counted; the line numbers (from 0) are what beats refer to.

- One request per script. If ElevenLabs rejects a very long script, split it into parts
  (`<id>-a`, `<id>-b`) at a paragraph break.
- Regenerating changes the timing of everything after the change. Beats keyed to words
  (`L(12, 'compare')`) follow it; beats keyed to raw seconds do not.

## 3. Hand over

Tell the user where the MP3 is and how long it runs. If the screen skill comes next, the
`lines.json` is its clock.
