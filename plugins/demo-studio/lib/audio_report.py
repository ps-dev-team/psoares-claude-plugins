#!/usr/bin/env python3
"""How a voice or a finished video sounds, in numbers.

    python3 audio_report.py <file> [<file> ...] [--lines timings.lines.json] [--json]

For each audio or video file: integrated loudness (LUFS), true peak (dBTP), loudness range (LU),
and the pauses (count, total and longest silence, below --db for at least --min seconds). Given a
lines.json (the timings the voice and stt_lines steps write), it also gives the speech rate in
words per minute, counted over the spoken lines only, so pauses do not lower it.

Needs ffmpeg. Nothing is changed.
"""
import argparse, json, re, subprocess, sys


def ffmpeg_stderr(path, af):
    r = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', path, '-vn', '-af', af, '-f', 'null', '-'],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f'{path}: ffmpeg failed\n{r.stderr[-400:]}')
    return r.stderr


def loudness(path):
    err = ffmpeg_stderr(path, 'loudnorm=print_format=json')
    j = json.loads(err[err.rindex('{', 0, err.rindex('}')):err.rindex('}') + 1])
    return float(j['input_i']), float(j['input_tp']), float(j['input_lra'])


def pauses(path, db, min_s):
    err = ffmpeg_stderr(path, f'silencedetect=n={db}dB:d={min_s}')
    d = [float(x) for x in re.findall(r'silence_duration: ([0-9.]+)', err)]
    return len(d), sum(d), max(d, default=0.0)


def duration(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                       capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def speech_rate(lines_path):
    lines = json.load(open(lines_path))
    words = sum(len(l.get('words') or l['text'].split()) for l in lines)
    spoken = sum(max(0.0, l['end'] - l['start']) for l in lines)
    return round(words / spoken * 60) if spoken else None


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('files', nargs='+')
    ap.add_argument('--lines', help='lines.json timings, for words per minute (one file only)')
    ap.add_argument('--db', type=float, default=-50, help='what counts as silence, dBFS')
    ap.add_argument('--min', type=float, default=0.2, help='shortest silence counted as a pause, seconds')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    rows = []
    for f in a.files:
        i, tp, lra = loudness(f)
        n, total, longest = pauses(f, a.db, a.min)
        row = {'file': f, 'seconds': round(duration(f), 1), 'lufs': i, 'true_peak': tp, 'lra': lra,
               'pauses': n, 'pause_total': round(total, 1), 'pause_longest': round(longest, 2)}
        if a.lines and len(a.files) == 1:
            row['wpm'] = speech_rate(a.lines)
        rows.append(row)
    if a.json:
        print(json.dumps(rows, indent=2))
        return
    head = ['file', 'length', 'LUFS', 'peak dBTP', 'LRA', 'pauses', 'silence', 'longest'] + (['wpm'] if any('wpm' in r for r in rows) else [])
    print(' | '.join(head))
    for r in rows:
        m, s = divmod(r['seconds'], 60)
        cells = [r['file'].split('/')[-1], f'{int(m)}:{s:04.1f}', f"{r['lufs']:.1f}", f"{r['true_peak']:.1f}", f"{r['lra']:.1f}",
                 str(r['pauses']), f"{r['pause_total']:.1f} s", f"{r['pause_longest']:.2f} s"] + ([str(r['wpm'])] if 'wpm' in r else [])
        print(' | '.join(cells))
    print('\nReference: -14 LUFS (YouTube), -16 LUFS (speech on the web, podcasts); true peak at or below -1 dBTP.')


if __name__ == '__main__':
    main()
