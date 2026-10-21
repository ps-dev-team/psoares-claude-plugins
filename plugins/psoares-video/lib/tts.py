# python3 tts.py <project> <id>: reads scripts/<id>.md with the project's
# ElevenLabs voice and writes audio/<id>.mp3, and beside it in audio/timings/
# <id>.align.json and <id>.lines.json (each line's start and end, and each
# word's start), so the audio folder shows only the voices.
#
# The key is ELEVENLABS_API_KEY, from the environment or ~/.config/elevenlabs/.env.
# It is never printed.
import base64, json, os, re, sys, urllib.request, urllib.error

def key():
    if os.environ.get('ELEVENLABS_API_KEY'):
        return os.environ['ELEVENLABS_API_KEY']
    path = os.path.expanduser('~/.config/elevenlabs/.env')
    if os.path.exists(path):
        for line in open(path):
            if line.strip().startswith('ELEVENLABS_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit('no ELEVENLABS_API_KEY: put it in ~/.config/elevenlabs/.env')

def config(root):
    c = json.load(open(os.path.join(root, 'video.config.json')))
    v = c.get('voice', {})
    if not v.get('id'):
        sys.exit('video.config.json has no voice.id')
    model = v.get('model', 'eleven_v4')
    # v4 reads its settings (stability, similarity, clone_strength) only through
    # text-to-dialogue, the endpoint the ElevenLabs website uses; text-to-speech
    # keeps stability alone. Other models take the text-to-speech set.
    given = v.get('settings', {})
    if model.startswith('eleven_v4'):
        settings = {'stability': 0.5, 'similarity': given.get('similarity_boost', 0.75)}
        settings.update({k: given[k] for k in ('stability', 'similarity', 'clone_strength') if k in given})
    else:
        settings = {'stability': 0.5, 'similarity_boost': 0.75, 'style': 0, 'use_speaker_boost': True, 'speed': 1}
        settings.update(given)
    return v['id'], model, v.get('format', 'mp3_44100_192'), settings, v.get('language')

def lines_of(align):
    # Lines that start with [ are directions alone; the rest are spoken lines.
    chars, st, en = align['characters'], align['character_start_times_seconds'], align['character_end_times_seconds']
    text = ''.join(chars)
    out, pos = [], 0
    for raw in text.split('\n'):
        start = pos
        pos += len(raw) + 1
        line = raw.strip()
        if not line or line.startswith('['):
            continue
        # A direction at the start of a spoken line is not part of its words.
        spoken = re.sub(r'^(\[[^\]]*\]\s*)+', '', line)
        off = start + raw.index(line) + (len(line) - len(spoken))
        words = [(m.group(0), round(st[off + m.start()], 3)) for m in re.finditer(r"[^\W_][\w'’-]*", spoken)]
        out.append({'i': len(out), 'text': spoken, 'start': round(st[off], 3),
                    'end': round(en[off + len(spoken) - 1], 3), 'words': words})
    return out

def main():
    if len(sys.argv) < 3:
        sys.exit('usage: python3 tts.py <project> <id>')
    root, vid = os.path.abspath(sys.argv[1]), sys.argv[2]
    voice, model, fmt, settings, language = config(root)
    text = open(os.path.join(root, 'scripts', f'{vid}.md')).read().strip()
    if model.startswith('eleven_v4'):
        url = f'https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format={fmt}'
        payload = {'inputs': [{'text': text, 'voice_id': voice}], 'model_id': model, 'settings': settings}
    else:
        url = f'https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format={fmt}'
        payload = {'text': text, 'model_id': model, 'voice_settings': settings}
    if language:
        # ISO 639-1, e.g. "pt": keeps the read in that language.
        payload['language_code'] = language
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, headers={'xi-api-key': key(), 'Content-Type': 'application/json'})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=600))
    except urllib.error.HTTPError as e:
        sys.exit(f'ElevenLabs {e.code}: {e.read()[:400].decode()}')
    out = os.path.join(root, 'audio', vid)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out + '.mp3', 'wb').write(base64.b64decode(d['audio_base64']))
    align = d.get('normalized_alignment') or d.get('alignment')
    tdir = os.path.join(root, 'audio', 'timings')
    os.makedirs(tdir, exist_ok=True)
    json.dump(align, open(os.path.join(tdir, vid + '.align.json'), 'w'))
    lines = lines_of(align)
    json.dump(lines, open(os.path.join(tdir, vid + '.lines.json'), 'w'), indent=1)
    for l in lines:
        print(f"{l['i']:3} {l['start']:7.2f}  {l['text']}")
    print(f'wrote audio/{vid}.mp3 ({len(text)} characters, {lines[-1]["end"]:.1f}s)' if lines else 'no spoken lines')

if __name__ == '__main__':
    main()
