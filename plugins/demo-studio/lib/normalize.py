#!/usr/bin/env python3
"""Bring a video or an audio file to a standard loudness, picture untouched.

    python3 normalize.py <in> [<out>] [--target -16 | --youtube] [--peak -1.5]

Two-pass EBU R128 (ffmpeg loudnorm): the first pass measures, the second applies one linear gain
to reach --target LUFS, with a true-peak limit at --peak dBTP and a loudness range of 11 LU. A
video stream is copied as it is (no re-encode); the audio is written as AAC 192 kbit/s, 48 kHz,
with faststart. Without <out>, the file is replaced and the original kept beside it as
<name>.pre-norm.<ext>. Prints the loudness before and after.

-16 LUFS suits speech on the web and in apps; --youtube uses -14, YouTube's reference. Players
in apps (Mux and the like) do not normalize, and platforms only turn loud files down, so a quiet
file stays quiet.
"""
import argparse, json, os, shutil, subprocess, sys


def measure(path, target, peak):
    r = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', path, '-vn', '-af',
                        f'loudnorm=I={target}:TP={peak}:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'{path}: ffmpeg failed\n{r.stderr[-400:]}')
    e = r.stderr
    return json.loads(e[e.rindex('{', 0, e.rindex('}')):e.rindex('}') + 1])


def has_video(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=index', '-of', 'csv=p=0', path],
                       capture_output=True, text=True)
    return bool(r.stdout.strip())


def normalize(src, dst, target=-16.0, peak=-1.5):
    m = measure(src, target, peak)
    af = (f"loudnorm=I={target}:TP={peak}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    video = has_video(src)
    args = ['ffmpeg', '-v', 'error', '-y', '-i', src]
    args += ['-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy'] if video else ['-map', '0:a:0']
    args += ['-af', af, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000']
    if video or dst.endswith(('.mp4', '.m4a', '.mov')):
        args += ['-movflags', '+faststart']
    subprocess.run(args + [dst], check=True)
    after = measure(dst, target, peak)
    return float(m['input_i']), float(m['input_tp']), float(after['input_i']), float(after['input_tp'])


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('src'); ap.add_argument('dst', nargs='?')
    ap.add_argument('--target', type=float, default=-16.0, help='integrated loudness, LUFS')
    ap.add_argument('--youtube', action='store_true', help='target -14 LUFS')
    ap.add_argument('--peak', type=float, default=-1.5, help='true-peak ceiling, dBTP')
    a = ap.parse_args()
    target = -14.0 if a.youtube else a.target
    src, dst = a.src, a.dst
    if not dst:
        base, ext = os.path.splitext(src)
        kept = f'{base}.pre-norm{ext}'
        if not os.path.exists(kept):
            shutil.move(src, kept)
        src, dst = kept, a.src
    bi, bp, ai, apk = normalize(src, dst, target, a.peak)
    print(f'{os.path.basename(dst)}: {bi:.1f} LUFS, peak {bp:.1f} dBTP  ->  {ai:.1f} LUFS, peak {apk:.1f} dBTP')


if __name__ == '__main__':
    main()
