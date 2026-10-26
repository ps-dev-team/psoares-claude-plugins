#!/usr/bin/env python3
"""Word timings and a misread check for any voice, with ElevenLabs Scribe (speech-to-text).

    python3 scribe.py voice.mp3 script.md out/name [--lang pt]

Writes out/name.lines.json (the same shape generate.py writes: each script line with start,
end and words) and out/name.stt.json (the raw transcript, kept so a second run costs nothing).
Then prints how well the voice matches the script, and every place it does not: a word the
voice skipped, added or said differently. That is where to listen for a misread, a word read
in the wrong language, or a tag read aloud.

Use it for website takes (they come without timings), for audio edited after generation
(cut pauses change every time), and as a check after any generation.
"""
import argparse, difflib, json, os, re, sys, unicodedata, uuid

sys.path.insert(0, os.path.dirname(__file__))
from elkey import call, key, API
import urllib.request, urllib.error

WORD = re.compile(r"[^\W_][\w'’-]*")


def norm(s):
    return re.sub(r'\W', '', unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode())


def transcribe(audio, lang):
    b = uuid.uuid4().hex
    fields = {'model_id': 'scribe_v1', 'timestamps_granularity': 'word'}
    if lang:
        fields['language_code'] = lang
    parts = [f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in fields.items()]
    parts.append(f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="{os.path.basename(audio)}"\r\n'
                 f'Content-Type: application/octet-stream\r\n\r\n'.encode() + open(audio, 'rb').read() + b'\r\n')
    body = b''.join(parts) + f'--{b}--\r\n'.encode()
    req = urllib.request.Request(API + '/v1/speech-to-text', data=body,
                                 headers={'xi-api-key': key(), 'Content-Type': f'multipart/form-data; boundary={b}'})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=900).read())
    except urllib.error.HTTPError as e:
        sys.exit(f'ElevenLabs {e.code}: {e.read()[:400].decode(errors="replace")}')


def main():
    a = argparse.ArgumentParser()
    a.add_argument('audio'); a.add_argument('script'); a.add_argument('out'); a.add_argument('--lang')
    o = a.parse_args()
    cache = o.out + '.stt.json'
    if not os.path.exists(cache):
        os.makedirs(os.path.dirname(os.path.abspath(o.out)), exist_ok=True)
        json.dump(transcribe(o.audio, o.lang), open(cache, 'w'), ensure_ascii=False)
    heard = [w for w in json.load(open(cache))['words'] if w.get('type') == 'word']

    text = re.sub(r'<!--.*?-->', '', open(o.script).read(), flags=re.S)
    lines = [re.sub(r'^(\[[^\]]*\]\s*)+', '', l.strip()) for l in text.splitlines()]
    lines = [l for l in lines if l and not l.startswith('[')]
    said = [(i, m.group(0)) for i, l in enumerate(lines) for m in WORD.finditer(l.replace('"', ''))]
    sm = difflib.SequenceMatcher(None, [norm(w) for _, w in said], [norm(w['text']) for w in heard], autojunk=False)
    t = [None] * len(said)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            h = heard[blk.b + k]; t[blk.a + k] = (h['start'], h['end'])
    for k in range(len(t)):  # a word not heard takes the end of the one before it
        if t[k] is None:
            prev = next((t[j] for j in range(k - 1, -1, -1) if t[j]), (0, 0))
            t[k] = (prev[1], prev[1])
    out = []
    for i, l in enumerate(lines):
        idx = [k for k, (li, _) in enumerate(said) if li == i]
        if idx:
            out.append({'i': i, 'text': l, 'start': t[idx[0]][0], 'end': t[idx[-1]][1],
                        'words': [[said[k][1], t[k][0]] for k in idx]})
    json.dump(out, open(o.out + '.lines.json', 'w'), indent=1, ensure_ascii=False)

    matched = sum(b.size for b in sm.get_matching_blocks())
    print(f'{len(out)} lines, {matched}/{len(said)} script words heard ({100 * matched // max(1, len(said))}%)')
    for op, a1, a2, b1, b2 in sm.get_opcodes():
        if op == 'equal':
            continue
        when = heard[b1]['start'] if b1 < len(heard) else (heard[-1]['end'] if heard else 0)
        script_side = ' '.join(w for _, w in said[a1:a2]) or '(nothing)'
        voice_side = ' '.join(w['text'] for w in heard[b1:b2]) or '(nothing)'
        print(f'  {when:7.2f}s  script: {script_side}  |  voice: {voice_side}')


if __name__ == '__main__':
    main()
