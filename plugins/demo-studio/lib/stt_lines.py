#!/usr/bin/env python3
"""Timings for a voice you brought: any audio or video, from any mic or any TTS.

    python3 stt_lines.py <project> <id> [--source FILE] [--lang en] [--backend auto|whisper|scribe]
                         [--speakers timeline/<id>.speakers.json]

Writes what `tts.py` writes, so the screen skill can time beats to it:
  audio/<id>.mp3                  the voice (extracted from --source when it is a video)
  audio/timings/<id>.lines.json   each spoken line's start and end, and each word's start

The words come from speech-to-text, then they are lined up against the script
(`scripts/<id>.md`) word by word, so the lines are the script's lines. With no script, the
transcript becomes one: one sentence per line, written to `scripts/<id>.md`.

Backends:
  whisper  local and free: the `openai-whisper` or `faster-whisper` Python package
           (pip install openai-whisper). The default when one is installed.
  scribe   ElevenLabs Scribe (paid), with ELEVENLABS_API_KEY in the environment or in
           ~/.config/elevenlabs/.env. The key is never printed.
The raw transcript is kept beside the lines as <id>.stt.json, so a second run costs nothing.

A conversation: write the script as `Who: what they say`, one line each, and pass --speakers.
The names are taken off the lines, and the file gets [{who, start, end}] per line: the speaker
timeline that broll's feed.py follows to make a fake camera talk when its person speaks.
"""
import argparse, difflib, json, os, re, subprocess, sys, tempfile, unicodedata, urllib.request

WORD = re.compile(r"[^\W_][\w'’-]*")


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode:
        sys.exit(f'{cmd[0]} failed:\n{p.stderr[-1200:]}')
    return p.stdout


def eleven_key():
    if os.environ.get('ELEVENLABS_API_KEY'):
        return os.environ['ELEVENLABS_API_KEY']
    env = os.path.expanduser('~/.config/elevenlabs/.env')
    if os.path.exists(env):
        for line in open(env):
            if line.startswith('ELEVENLABS_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('Scribe needs ELEVENLABS_API_KEY (environment or ~/.config/elevenlabs/.env).')


def scribe(audio, lang):
    """[(word, start, end)] from ElevenLabs Scribe."""
    boundary = '----stt' + os.urandom(8).hex()
    fields = [('model_id', 'scribe_v1'), ('timestamps_granularity', 'word')]
    if lang:
        fields.append(('language_code', lang))
    body = b''
    for k, v in fields:
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    body += (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\n'
             'Content-Type: audio/wav\r\n\r\n').encode() + open(audio, 'rb').read() + f'\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/speech-to-text', data=body, headers={
        'xi-api-key': eleven_key(), 'Content-Type': f'multipart/form-data; boundary={boundary}'})
    d = json.load(urllib.request.urlopen(req, timeout=900))
    return [(w['text'], w['start'], w['end']) for w in d['words'] if w.get('type') == 'word']


def whisper(audio, lang):
    """[(word, start, end)] from a local Whisper."""
    try:
        import whisper as ow  # openai-whisper
        r = ow.load_model(os.environ.get('WHISPER_MODEL', 'small')).transcribe(audio, language=lang, word_timestamps=True)
        return [(w['word'].strip(), w['start'], w['end']) for s in r['segments'] for w in s.get('words', [])]
    except ImportError:
        pass
    try:
        from faster_whisper import WhisperModel
        segs, _ = WhisperModel(os.environ.get('WHISPER_MODEL', 'small')).transcribe(audio, language=lang, word_timestamps=True)
        return [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or [])]
    except ImportError:
        sys.exit('No local Whisper: pip install openai-whisper (or faster-whisper), or use --backend scribe.')


def has_whisper():
    for mod in ('whisper', 'faster_whisper'):
        try:
            __import__(mod)
            return True
        except ImportError:
            pass
    return False


def norm(s):
    return re.sub(r'[^\w]', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode())


def spoken_lines(text):
    """The script's spoken lines, as tts.py reads them: comments out, [direction] lines skipped."""
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    out = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith('['):
            continue
        out.append(re.sub(r'^(\[[^\]]*\]\s*)+', '', line))
    return out


def script_from(words):
    """No script: the transcript, one sentence per line."""
    lines, cur = [], []
    for w, *_ in words:
        cur.append(w)
        if re.search(r'[.!?…]["’”]?$', w):
            lines.append(' '.join(cur)); cur = []
    if cur:
        lines.append(' '.join(cur))
    return '\n\n'.join(lines) + '\n'


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('project'); ap.add_argument('id')
    ap.add_argument('--source', help='an audio or video file (default audio/<id>.mp3)')
    ap.add_argument('--lang', help='ISO 639-1 code, e.g. en, pt')
    ap.add_argument('--backend', default='auto', choices=['auto', 'whisper', 'scribe'])
    ap.add_argument('--speakers', help='write a speaker timeline here (script lines as "Who: text")')
    a = ap.parse_args()
    root = os.path.abspath(a.project)
    voice = os.path.join(root, 'audio', f'{a.id}.mp3')
    tdir = os.path.join(root, 'audio', 'timings'); os.makedirs(tdir, exist_ok=True)
    src = os.path.abspath(a.source) if a.source else voice
    if not os.path.exists(src):
        sys.exit(f'no audio: {src}')
    if os.path.abspath(src) != voice:  # a video, a wav, a file elsewhere: the project keeps an mp3
        run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vn', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '192k', voice])

    cache = os.path.join(tdir, f'{a.id}.stt.json')
    if os.path.exists(cache):
        words = [tuple(w) for w in json.load(open(cache))]
    else:
        backend = a.backend if a.backend != 'auto' else ('whisper' if has_whisper() else 'scribe')
        with tempfile.TemporaryDirectory() as tmp:
            wav = os.path.join(tmp, 'a.wav')
            run(['ffmpeg', '-v', 'error', '-y', '-i', voice, '-ac', '1', '-ar', '16000', wav])
            words = (whisper if backend == 'whisper' else scribe)(wav, a.lang)
        json.dump(words, open(cache, 'w'), ensure_ascii=False)
        print(f'{backend}: {len(words)} words')

    sfile = os.path.join(root, 'scripts', f'{a.id}.md')
    if not os.path.exists(sfile):
        os.makedirs(os.path.dirname(sfile), exist_ok=True)
        open(sfile, 'w').write(script_from(words))
        print(f'no script: wrote scripts/{a.id}.md from the transcript')
    lines = spoken_lines(open(sfile).read())
    who = [None] * len(lines)
    if a.speakers:  # "Who: text": the name is the speaker, not a spoken word
        for k, l in enumerate(lines):
            m = re.match(r'^([^:]{1,40}):\s+(.*)$', l)
            if m:
                who[k], lines[k] = m.group(1).strip(), m.group(2)
    sw = [(li, m.group(0)) for li, l in enumerate(lines) for m in WORD.finditer(l)]
    t = [None] * len(sw)
    sm = difflib.SequenceMatcher(None, [norm(w) for _, w in sw], [norm(w[0]) for w in words], autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            t[blk.a + k] = (words[blk.b + k][1], words[blk.b + k][2])
    matched = sum(x is not None for x in t)
    last = (0.0, 0.0)
    for i in range(len(t)):  # a word speech-to-text missed starts where the one before ended
        if t[i] is None:
            t[i] = (last[1], last[1])
        last = t[i]
    out = []
    for li, text in enumerate(lines):
        idx = [k for k, (x, _) in enumerate(sw) if x == li]
        if not idx:
            continue
        out.append({'i': len(out), 'text': text, 'start': round(t[idx[0]][0], 3), 'end': round(t[idx[-1]][1], 3),
                    'words': [[sw[k][1], round(t[k][0], 3)] for k in idx]})
        if who[li]:
            out[-1]['who'] = who[li]
    json.dump(out, open(os.path.join(tdir, f'{a.id}.lines.json'), 'w'), ensure_ascii=False, indent=1)
    if a.speakers:
        spk = [{'who': l['who'], 'start': l['start'], 'end': l['end']} for l in out if l.get('who')]
        sp = a.speakers if os.path.isabs(a.speakers) else os.path.join(root, a.speakers)
        os.makedirs(os.path.dirname(sp), exist_ok=True)
        json.dump(spk, open(sp, 'w'), indent=1)
        print(f'{len(spk)} speaker segments -> {os.path.relpath(sp, root)}')
    pct = 100 * matched // max(1, len(sw))
    print(f'{len(out)} lines, {matched}/{len(sw)} words matched ({pct}%)')
    if pct < 90:
        print('Under 90%: the audio and the script differ. Check the script, or delete it to use the transcript.')


if __name__ == '__main__':
    main()
