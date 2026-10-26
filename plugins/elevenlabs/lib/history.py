#!/usr/bin/env python3
"""Takes made on the ElevenLabs website, fetched from the history.

    python3 history.py list [--voice VOICE_ID] [--limit 20]
    python3 history.py get HISTORY_ID out/name        # out/name.mp3 and out/name.txt (the text sent)

The website makes two takes per generation on v4 (model eleven_v4 and eleven_v4_exp), and they
pace differently. List them, listen, keep the one you like. Website audio has no timings: run
scribe.py on the kept take to get them.
"""
import argparse, datetime, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from elkey import call


def main():
    a = argparse.ArgumentParser()
    s = a.add_subparsers(dest='cmd', required=True)
    l = s.add_parser('list'); l.add_argument('--voice'); l.add_argument('--limit', type=int, default=20)
    g = s.add_parser('get'); g.add_argument('id'); g.add_argument('out')
    o = a.parse_args()
    if o.cmd == 'list':
        q = f'/v1/history?page_size={o.limit}' + (f'&voice_id={o.voice}' if o.voice else '')
        for h in call(q).get('history', []):
            when = datetime.datetime.fromtimestamp(h.get('date_unix', 0)).strftime('%Y-%m-%d %H:%M')
            text = (h.get('text') or '').replace('\n', ' ')
            print(f"{h['history_item_id']}  {when}  {h.get('model_id', '?'):14}  {len(h.get('text') or ''):5} chars  {text[:60]}")
    else:
        h = call(f'/v1/history/{o.id}')
        os.makedirs(os.path.dirname(os.path.abspath(o.out)), exist_ok=True)
        open(o.out + '.txt', 'w').write(h.get('text') or '')
        open(o.out + '.mp3', 'wb').write(call(f'/v1/history/{o.id}/audio', raw=True))
        print(f'wrote {o.out}.mp3 and {o.out}.txt ({h.get("model_id")})')


if __name__ == '__main__':
    main()
