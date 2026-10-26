#!/usr/bin/env python3
"""Make the copy of a script that is sent to the model. The script itself is never changed.

    python3 clean.py script.md [--fix fixes.json] [-o out.md]

- HTML comments (<!-- notes for the editor -->) are removed: they would be read aloud.
- Quote marks are removed: v4 can read them as a change of voice.
- Trailing spaces go, and runs of blank lines become one.
- --fix applies pronunciation fixes, whole words only: {"AI": "ay-eye", "IA": "i-á"}.
  They live in the sent copy only, so the script keeps its real spelling.
"""
import argparse, json, re, sys


def clean(text, fixes=None):
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    text = re.sub(r'["“”„«»]', '', text)
    text = re.sub(r'[ \t]+$', '', text, flags=re.M)
    text = re.sub(r'\n{3,}', '\n\n', text)
    for word, said in (fixes or {}).items():
        text = re.sub(rf'(?<![\w-]){re.escape(word)}(?![\w-])', said, text)
    return text.strip() + '\n'


if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('script'); a.add_argument('--fix'); a.add_argument('-o')
    o = a.parse_args()
    out = clean(open(o.script).read(), json.load(open(o.fix)) if o.fix else None)
    (open(o.o, 'w').write(out) if o.o else sys.stdout.write(out))
