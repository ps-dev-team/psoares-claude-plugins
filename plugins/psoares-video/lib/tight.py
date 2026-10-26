#!/usr/bin/env python3
"""Shorter pauses in a voice, with no cut you can hear.

    python3 tight.py <project> <id> [--max 0.3]     audio/<id>.mp3 in place (the first run keeps
                                                     the original as audio/<id>.orig.mp3)
    python3 tight.py <in> <out> [--max 0.3]          any file

Every silence longer than --max seconds is shortened to --max. The cut sits in the middle of
the silence, where it is quietest (below --db), and joins with an equal-power crossfade of
--xf seconds, so no click or breath is cut. Long pauses make a voice-over sound mechanical;
0.3 s keeps it natural and moving.

Times change, so run stt_lines.py afterwards for new timings (project mode removes the old
transcript cache for you). Needs numpy: python3 -m venv .venv && .venv/bin/pip install numpy.
"""
import argparse, os, shutil, subprocess, sys
try:
    import numpy as np
except ImportError:
    sys.exit('tight.py needs numpy: python3 -m venv .venv && .venv/bin/pip install numpy, then run it with .venv/bin/python')

SR = 44100


def tighten(src, dst, maxs, db, xfs):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    hop = int(SR * 0.01)
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    quiet = 20 * np.log10(rms) < db
    runs, i = [], 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            runs.append((i * hop, j * hop)); i = j
        else:
            i += 1
    xf, keep = int(SR * xfs), int(SR * maxs)
    fade_in, fade_out = np.sin(np.linspace(0, np.pi / 2, xf)), np.cos(np.linspace(0, np.pi / 2, xf))
    out, pos = [], 0
    for a, b in runs:
        if b - a <= keep + xf:
            continue
        cut_a, cut_b = a + keep // 2, b - keep // 2  # remove [cut_a, cut_b), crossfading xf samples
        out.append(x[pos:cut_a])
        tail = out[-1][-xf:].copy(); out[-1] = out[-1][:-xf]
        out.append(tail * fade_out + x[cut_b:cut_b + xf] * fade_in)
        pos = cut_b + xf
    out.append(x[pos:])
    y = np.concatenate(out)
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', '192k', dst], input=pcm, check=True)
    print(f'{len(x) / SR:.1f}s -> {len(y) / SR:.1f}s')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('a'); ap.add_argument('b')
    ap.add_argument('--max', type=float, default=0.30, help='longest pause kept, seconds')
    ap.add_argument('--db', type=float, default=-50, help='what counts as silence, dBFS')
    ap.add_argument('--xf', type=float, default=0.03, help='crossfade, seconds')
    o = ap.parse_args()
    if os.path.isdir(o.a):
        voice = os.path.join(o.a, 'audio', f'{o.b}.mp3')
        orig = os.path.join(o.a, 'audio', f'{o.b}.orig.mp3')
        if not os.path.exists(orig):
            shutil.copy(voice, orig)
        tighten(orig, voice, o.max, o.db, o.xf)
        cache = os.path.join(o.a, 'audio', 'timings', f'{o.b}.stt.json')
        if os.path.exists(cache):
            os.remove(cache)
        print(f'now: python3 stt_lines.py {o.a} {o.b}')
    else:
        tighten(o.a, o.b, o.max, o.db, o.xf)


if __name__ == '__main__':
    main()
