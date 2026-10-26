#!/usr/bin/env python3
"""Script in, voice and timings out.

    python3 generate.py script.md out/name --voice VOICE_ID [--lang pt] [--model eleven_v4]
                        [--stability 1] [--similarity 1] [--clone-strength 1] [--fix fixes.json]
                        [--lines 1-4]

Writes out/name.mp3 and out/name.lines.json: each spoken line with its start, end and words
([[word, start], ...]). Lines that start with [ are directions (tags), not spoken lines.

On eleven_v4 the request goes through text-to-dialogue, the endpoint the ElevenLabs website
uses: it is the one that honours similarity and clone strength, so a cloned voice keeps the
speaker's accent. text-to-speech keeps stability alone on v4. Other models use text-to-speech.

--lines 1-4 sends only those spoken lines (a test of a new voice or new tags, cheap).
The script is cleaned first (clean.py): comments and quote marks out, fixes applied.
"""
import argparse, base64, json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from elkey import call
from clean import clean

WORD = re.compile(r"[^\W_][\w'’-]*")


def pick_lines(text, rng):
    a, b = (int(x) for x in rng.split('-'))
    out, n = [], 0
    for raw in text.split('\n'):
        s = raw.strip()
        if s and not s.startswith('['):
            n += 1
            if not a <= n <= b:
                continue
        out.append(raw)
    return '\n'.join(out)


def lines_of(align):
    chars, st, en = align['characters'], align['character_start_times_seconds'], align['character_end_times_seconds']
    text = ''.join(chars)
    out, pos = [], 0
    for raw in text.split('\n'):
        start = pos
        pos += len(raw) + 1
        line = raw.strip()
        if not line or line.startswith('['):
            continue
        spoken = re.sub(r'^(\[[^\]]*\]\s*)+', '', line)
        off = start + raw.index(line) + (len(line) - len(spoken))
        words = [[m.group(0), round(st[off + m.start()], 3)] for m in WORD.finditer(spoken)]
        out.append({'i': len(out), 'text': spoken, 'start': round(st[off], 3),
                    'end': round(en[off + len(spoken) - 1], 3), 'words': words})
    return out


def main():
    a = argparse.ArgumentParser()
    a.add_argument('script'); a.add_argument('out')
    a.add_argument('--voice', required=True); a.add_argument('--lang')
    a.add_argument('--model', default='eleven_v4'); a.add_argument('--format', default='mp3_44100_192')
    a.add_argument('--stability', type=float, default=1.0)
    a.add_argument('--similarity', type=float, default=1.0)
    a.add_argument('--clone-strength', type=float, default=1.0)
    a.add_argument('--fix'); a.add_argument('--lines')
    o = a.parse_args()

    text = clean(open(o.script).read(), json.load(open(o.fix)) if o.fix else None)
    if o.lines:
        text = pick_lines(text, o.lines)
    if o.model.startswith('eleven_v4'):
        path = f'/v1/text-to-dialogue/with-timestamps?output_format={o.format}'
        body = {'inputs': [{'text': text, 'voice_id': o.voice}], 'model_id': o.model,
                'settings': {'stability': o.stability, 'similarity': o.similarity, 'clone_strength': o.clone_strength}}
    else:
        path = f'/v1/text-to-speech/{o.voice}/with-timestamps?output_format={o.format}'
        body = {'text': text, 'model_id': o.model,
                'voice_settings': {'stability': o.stability, 'similarity_boost': o.similarity}}
    if o.lang:
        body['language_code'] = o.lang  # ISO 639-1; the same clone can speak another language
    d = call(path, body)
    os.makedirs(os.path.dirname(os.path.abspath(o.out)), exist_ok=True)
    open(o.out + '.mp3', 'wb').write(base64.b64decode(d['audio_base64']))
    lines = lines_of(d.get('normalized_alignment') or d.get('alignment'))
    json.dump(lines, open(o.out + '.lines.json', 'w'), indent=1, ensure_ascii=False)
    for l in lines:
        print(f"{l['i']:3} {l['start']:7.2f}  {l['text']}")
    print(f'wrote {o.out}.mp3 ({len(text)} characters billed, {lines[-1]["end"]:.1f} s)' if lines else 'no spoken lines')


if __name__ == '__main__':
    main()
