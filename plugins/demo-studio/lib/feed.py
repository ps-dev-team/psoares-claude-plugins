#!/usr/bin/env python3
"""A fake-camera feed from two clips of one person: listening and talking.

    feed.py --listen L.mp4 --talk T.mp4 --out face.y4m --size 640x360 --fps 20 --dur 81
            [--speakers speakers.json --who host] [--hold 6] [--fade 0.25] [--face cx,cy]

The person listens, and talks inside the segments where `--who` speaks in `speakers.json`
(a list of {who, start, end}). Lines of the same speaker less than a second apart join into one
segment. `--hold` keeps the first seconds listening whatever the timeline says: a camera
preview before a call should show someone waiting, not talking.

Every frame is cropped around the face: its centre is found with macOS Vision (face.swift) on
the listening clip, or given with --face (fractions, top-left origin; required on Linux and
Windows). The face sits on the
vertical centre line of the output and a little above the middle. Each clip is first made a
seamless loop (its tail crossfades into its head), so a feed of any length never jumps.
The output is the size and frame rate Chrome's --use-file-for-fake-video-capture plays; make
--dur the length of the matching fake audio, so both loop in step.
"""
import argparse, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode:
        sys.exit(f'{cmd[0]} failed:\n{p.stderr[-1500:]}')
    return p.stdout


def probe(f):
    out = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
               'stream=width,height:format=duration', '-of', 'json', f])
    d = json.loads(out)
    return d['streams'][0]['width'], d['streams'][0]['height'], float(d['format']['duration'])


def face_centre(clip, tmp):
    w, h, dur = probe(clip)
    xs, ys = [], []
    for k, t in enumerate((dur * 0.2, dur * 0.5, dur * 0.8)):
        png = os.path.join(tmp, f'f{k}.png')
        run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', clip, '-frames:v', '1', png])
        try:
            p = subprocess.run(['swift', os.path.join(HERE, 'face.swift'), png], capture_output=True, text=True)
        except FileNotFoundError:
            p = None
        if p and p.returncode == 0:
            cx, cy, *_ = map(float, p.stdout.split())
            xs.append(cx); ys.append(cy)
    if not xs:
        if sys.platform != 'darwin':
            sys.exit(f'finding the face needs macOS (Vision, face.swift). On {sys.platform}, pass --face cx,cy')
        sys.exit(f'no face found in {clip}: pass --face cx,cy')
    xs.sort(); ys.sort()
    return xs[len(xs) // 2], ys[len(ys) // 2]


def crop_for(w, h, cx, cy, W, H, eye=0.42):
    """The largest W:H crop with the face on its vertical centre line, eye-line near `eye`."""
    ar = W / H
    cw = min(w, 2 * min(cx, 1 - cx) * w)
    ch = cw / ar
    if ch > h:
        ch = h; cw = ch * ar
    cw, ch = int(cw) // 2 * 2, int(ch) // 2 * 2
    x0 = round(cx * w - cw / 2)
    y0 = min(max(0, round(cy * h - eye * ch)), h - ch)
    return cw, ch, max(0, min(x0, w - cw)), y0


def segments(speakers, who, hold, gap=1.0, pre=0.2, post=0.25):
    segs = []
    for s in speakers:
        if s['who'] != who or s['end'] - s['start'] < 0.1:
            continue
        a, b = s['start'] - pre, s['end'] + post
        if segs and a - segs[-1][1] < gap:
            segs[-1][1] = b
        else:
            segs.append([a, b])
    return [[max(a, hold), b] for a, b in segs if b > hold + 0.3]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--listen', required=True); ap.add_argument('--talk')
    ap.add_argument('--out', required=True); ap.add_argument('--size', default='640x360')
    ap.add_argument('--fps', type=int, default=20); ap.add_argument('--dur', type=float, required=True)
    ap.add_argument('--speakers'); ap.add_argument('--who'); ap.add_argument('--hold', type=float, default=0)
    ap.add_argument('--fade', type=float, default=0.25); ap.add_argument('--face')
    ap.add_argument('--loop-fade', type=float, default=0.6)
    a = ap.parse_args()
    W, H = map(int, a.size.split('x'))
    tmp = tempfile.mkdtemp(prefix='feed-')
    cx, cy = map(float, a.face.split(',')) if a.face else face_centre(a.listen, tmp)
    print(f'face at {cx:.3f},{cy:.3f}')

    loops = []
    for name, clip in (('listen', a.listen), ('talk', a.talk)):
        if not clip:
            continue
        w, h, dur = probe(clip)
        cw, ch, x0, y0 = crop_for(w, h, cx, cy, W, H)
        f = a.loop_fade
        out = os.path.join(tmp, f'{name}.mp4')
        vf = (f'[0:v]fps={a.fps},crop={cw}:{ch}:{x0}:{y0},scale={W}:{H}:flags=lanczos,setsar=1,split[x][y];'
              f'[x]trim={f}:{dur:.3f},setpts=PTS-STARTPTS,fps={a.fps}[a];[y]trim=0:{f},setpts=PTS-STARTPTS,fps={a.fps}[b];'
              f'[a][b]xfade=transition=fade:duration={f}:offset={dur - 2 * f:.3f},format=yuv420p')
        run(['ffmpeg', '-v', 'error', '-y', '-i', clip, '-filter_complex', vf, '-an',
             '-c:v', 'libx264', '-crf', '10', '-preset', 'fast', out])
        loops.append(out)

    segs = segments(json.load(open(a.speakers)), a.who, a.hold) if a.speakers and a.talk else []
    if segs:
        d = a.fade
        k = '+'.join(f'clip((T-{s:.2f})/{d},0,1)*clip(({e:.2f}-T)/{d},0,1)' for s, e in segs)
        fc = f"[0:v][1:v]blend=all_expr='A*(1-clip({k},0,1))+B*clip({k},0,1)'"
        cmd = ['ffmpeg', '-v', 'error', '-y', '-stream_loop', '-1', '-i', loops[0],
               '-stream_loop', '-1', '-i', loops[1], '-filter_complex', fc]
    else:
        cmd = ['ffmpeg', '-v', 'error', '-y', '-stream_loop', '-1', '-i', loops[0]]
    run(cmd + ['-t', f'{a.dur:.3f}', '-r', str(a.fps), '-pix_fmt', 'yuv420p', '-strict', '-1', a.out])
    json.dump({'face': [cx, cy], 'size': [W, H], 'fps': a.fps, 'dur': a.dur, 'hold': a.hold,
               'talk': [[round(s, 2), round(e, 2)] for s, e in segs]}, open(os.path.splitext(a.out)[0] + '.feed.json', 'w'), indent=1)
    print(a.out, f'{len(segs)} talk segments')


if __name__ == '__main__':
    main()
