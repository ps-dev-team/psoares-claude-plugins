#!/usr/bin/env python3
"""How a voice paces and how loud it is. Needs ffmpeg; no API call.

    python3 analyze.py voice.mp3 [--lines voice.lines.json] [--floor -50]

Prints speaking speed (words per minute, from the timings, counting speech only), the pauses
(how many, total, longest, found below --floor dB) and loudness (integrated LUFS, true peak).
Compare two languages or two takes with it before deciding a pause cap.
"""
import argparse, json, re, subprocess


def ff(audio, filt):
    return subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', audio, '-vn', '-af', filt, '-f', 'null', '-'],
                          capture_output=True, text=True).stderr


def main():
    a = argparse.ArgumentParser()
    a.add_argument('audio'); a.add_argument('--lines'); a.add_argument('--floor', type=float, default=-50)
    o = a.parse_args()
    pauses = [float(x) for x in re.findall(r'silence_duration: ([\d.]+)', ff(o.audio, f'silencedetect=n={o.floor}dB:d=0.2'))]
    loud = ff(o.audio, 'loudnorm=print_format=summary')
    lufs = re.search(r'Input Integrated:\s+(-?[\d.]+)', loud)
    tp = re.search(r'Input True Peak:\s+(-?[\d.]+|-inf)', loud)
    if o.lines:
        d = json.load(open(o.lines))
        words = sum(len(l['words']) for l in d)
        speech = sum(l['end'] - l['start'] for l in d)
        print(f'speed     {words / speech * 60:.0f} words per minute ({words} words in {speech:.0f} s of speech)')
    print(f'pauses    {len(pauses)} over 0.2 s, {sum(pauses):.1f} s in total, longest {max(pauses, default=0):.2f} s')
    print(f'loudness  {lufs.group(1) if lufs else "?"} LUFS integrated, true peak {tp.group(1) if tp else "?"} dBTP')


if __name__ == '__main__':
    main()
