"""The ElevenLabs key and a small request helper, shared by the scripts here.

The key is ELEVENLABS_API_KEY, from the environment or ~/.config/elevenlabs/.env.
It is never printed, logged or passed on a command line.
"""
import json, os, sys, urllib.error, urllib.request

API = 'https://api.elevenlabs.io'
KEY_FILE = os.path.expanduser('~/.config/elevenlabs/.env')


def key():
    if os.environ.get('ELEVENLABS_API_KEY'):
        return os.environ['ELEVENLABS_API_KEY']
    if os.path.exists(KEY_FILE):
        for line in open(KEY_FILE):
            if line.strip().startswith('ELEVENLABS_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"\'')
    sys.exit(f'no ELEVENLABS_API_KEY: put it in {KEY_FILE} (see the skill, "The key")')


def call(path, body=None, raw=False, timeout=600):
    """GET (no body) or POST JSON to the API. Returns parsed JSON, or bytes with raw=True."""
    data = json.dumps(body).encode() if body is not None else None
    headers = {'xi-api-key': key()}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(API + path, data=data, headers=headers)
    try:
        r = urllib.request.urlopen(req, timeout=timeout).read()
    except urllib.error.HTTPError as e:
        sys.exit(f'ElevenLabs {e.code}: {e.read()[:400].decode(errors="replace")}')
    return r if raw else json.loads(r)
