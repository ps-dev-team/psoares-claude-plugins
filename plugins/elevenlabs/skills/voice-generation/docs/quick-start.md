# Voice generation: quick start

1. Put your key in a file (once). Run this yourself and paste your key where it says PASTE:

   ```sh
   mkdir -p ~/.config/elevenlabs && printf 'ELEVENLABS_API_KEY=%s\n' 'PASTE' > ~/.config/elevenlabs/.env && chmod 600 ~/.config/elevenlabs/.env
   ```

2. Find your voice id on the ElevenLabs site (the voice's page) and write a script,
   `intro.md`, one sentence per line:

   ```
   [warm]
   In this video, I'll show you how to plan your week in three steps.

   [short pause]
   First, you list what has to happen.
   ```

3. Test four lines, listen:

   ```sh
   python3 lib/generate.py intro.md out/intro --voice VOICE_ID --lang en --lines 1-4
   ```

4. Generate the whole script, then check it:

   ```sh
   python3 lib/generate.py intro.md out/intro --voice VOICE_ID --lang en
   python3 lib/scribe.py out/intro.mp3 intro.md out/intro-check --lang en
   ```

You get `out/intro.mp3`, `out/intro.lines.json`, and a list of any spot where the voice
differs from the script.
