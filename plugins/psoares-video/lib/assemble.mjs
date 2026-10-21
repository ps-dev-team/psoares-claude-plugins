// node assemble.mjs <project> <id>: the recorded segments -> build/<id>.mp4.
//
// Each window's clip is redrawn by the camera (Remotion: the large pointer and
// the spring zoom), or, with pointer.mode "page", taken from its frames as
// they are. One window fills the frame; two sit in the plain browser frame.
// Segments are joined with a fade, and the voice goes under, with silence cut
// in where the beats asked for gaps. Without a voice the video is silent.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadProject, loadVideo } from './project.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [dir, id] = process.argv.slice(2);
if (!dir || !id) { console.error('usage: node assemble.mjs <project> <id>'); process.exit(2); }
const project = loadProject(dir);
const { config, p } = project;
const { L, segments, length } = await loadVideo(project, id);
const { width: W, height: H, fps, crf } = config.output;
const T = config.transition.seconds;
const drawn = config.pointer.mode !== 'page';

// The cursor set: SVGs named <shape>-1__<x>-<y>.svg, x and y the hot spot in
// percent (Screen Studio's own format, so its sets can be copied out of the
// app). config.pointer.cursors names the folder; without one the pointer is
// drawn. Read once, passed to the renderer as data URIs.
function cursorImages() {
  const dir = (config.pointer.cursors ?? '~/.config/psoares-video/cursors/macos-tahoe').replace(/^~/, process.env.HOME);
  if (!fs.existsSync(dir)) return null;
  const want = { arrow: 'pointer', hand: 'pointinghand', ibeam: 'ibeam', openhand: 'openhand', closedhand: 'closedhand', notallowed: 'notallowed', resizeleftright: 'resizeleftright', resizeupdown: 'resizeupdown', move: 'move' };
  const out = {};
  for (const [shape, name] of Object.entries(want)) {
    const f = fs.readdirSync(dir).find((n) => n.startsWith(name + '-') && n.endsWith('.svg'));
    if (!f) continue;
    const m = f.match(/__(\d+)-(\d+)\.svg$/);
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/) ?? [0, 1, 1];
    out[shape] = { src: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'), hot: [+(m?.[1] ?? 0) / 100, +(m?.[2] ?? 0) / 100], aspect: +h / +w };
  }
  return Object.keys(out).length ? out : null;
}
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

// The camera project, installed once outside the plugin (plugin folders are
// replaced on update).
function cameraDir() {
  const dest = path.join(os.homedir(), '.cache', 'psoares-video', 'camera');
  const src = path.join(HERE, 'camera');
  const stamp = fs.readFileSync(path.join(src, 'package.json'), 'utf8');
  const have = fs.existsSync(path.join(dest, 'package.json')) && fs.readFileSync(path.join(dest, 'package.json'), 'utf8') === stamp;
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(path.join(src, 'src'), path.join(dest, 'src'), { recursive: true });
  if (!have || !fs.existsSync(path.join(dest, 'node_modules'))) {
    fs.writeFileSync(path.join(dest, 'package.json'), stamp);
    console.log('installing the camera (once)…');
    execFileSync('pnpm', ['install', '--silent'], { cwd: dest, stdio: 'inherit' });
  }
  return dest;
}

// Renders one window's clip [from, from + len] (recording seconds) at w x h.
function camera(raw, from, len, w, h, out) {
  const meta = JSON.parse(fs.readFileSync(path.join(raw, 'meta.json'), 'utf8'));
  const ptr = JSON.parse(fs.readFileSync(path.join(raw, 'pointer.json'), 'utf8'));
  const props = {
    fps, width: w, height: h, from, duration: len, view: meta.view,
    frames: meta.frames, moves: ptr.moves, presses: ptr.presses, zooms: ptr.zooms, marks: ptr.marks ?? [],
    pointer: { size: config.pointer.size, show: true, blur: config.pointer.blur !== false, marquee: config.pointer.marquee ?? '#0a84ff', images: cursorImages() }, blur: config.camera.blur,
  };
  const propsFile = path.join(raw, `camera-${from.toFixed(2)}.json`);
  fs.writeFileSync(propsFile, JSON.stringify(props));
  const cam = cameraDir();
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', 'Camera', out, `--props=${propsFile}`, `--public-dir=${raw}`,
    '--codec=h264', `--crf=${Math.max(1, crf - 1)}`, `--concurrency=${config.camera.concurrency}`, '--log=error'],
  { cwd: cam, stdio: 'inherit' });
}

const parts = [];
// The report: what was done to the voice and what went wrong on the take,
// with the time in the finished video, so the user knows where to look.
const report = { notes: [], gaps: [] };
const tc = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
for (const [k, s] of segments.entries()) {
  const raws = s.windows.map((spec) => p('raw', `${id}-${s.name}-${spec.account ?? 'anon'}`));
  const meta = JSON.parse(fs.readFileSync(path.join(raws[0], 'meta.json'), 'utf8'));
  for (const raw of raws) {
    const m = JSON.parse(fs.readFileSync(path.join(raw, 'meta.json'), 'utf8'));
    for (const [t, msg] of m.notes ?? []) report.notes.push([t, `${s.name}: ${msg}`]);
  }
  // This part's span in voice time, overlapping its neighbours by half a fade.
  const a = k === 0 ? 0 : s.start - T / 2;
  const b = k === segments.length - 1 ? length : segments[k + 1].start + T / 2;
  const from = a - meta.start, len = b - a;
  const out = p('build', `${id}-${k}.mp4`);
  const framed = raws.length === 2 || config.frame.single;
  let boxes = null;
  if (framed) {
    const n = raws.length;
    const bf = p('frame', `boxes-${n}.json`);
    if (!fs.existsSync(bf)) execFileSync('python3', [path.join(HERE, 'frame_layers.py'), project.root, String(n)], { stdio: 'inherit' });
    boxes = JSON.parse(fs.readFileSync(bf, 'utf8'));
  }
  const size = (i) => (boxes ? [boxes[i].w, boxes[i].h] : [W, H]);
  // Each window's clip, already at the size it is shown at.
  const clips = raws.map((raw, i) => {
    const clip = p('build', `${id}-${k}-w${i}.mp4`);
    const [w, h] = size(i);
    if (drawn) camera(raw, from, len, w, h, clip);
    else ff(['-f', 'concat', '-safe', '0', '-i', path.join(raw, 'list.txt'), '-vf',
      `fps=${fps},trim=${from}:${from + len},setpts=PTS-STARTPTS,scale=${w}:${h}:flags=lanczos,setsar=1`, '-c:v', 'libx264', '-crf', String(crf - 1), clip]);
    return clip;
  });
  if (!boxes) {
    ff(['-i', clips[0], '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', String(crf), '-t', String(len), out]);
  } else {
    const n = raws.length;
    const inputs = [...clips.flatMap((c) => ['-i', c]), '-loop', '1', '-i', p('frame', `back-${n}.png`), '-loop', '1', '-i', p('frame', `front-${n}.png`)];
    let f = `[${n}:v]fps=${fps}[s0]`;
    clips.forEach((_, i) => { f += `;[s${i}][${i}:v]overlay=${boxes[i].x}:${boxes[i].y}[s${i + 1}]`; });
    f += `;[s${n}][${n + 1}:v]overlay=0:0,format=yuv420p[v]`;
    ff([...inputs, '-filter_complex', f, '-map', '[v]', '-c:v', 'libx264', '-crf', String(crf), '-t', String(len), out]);
  }
  parts.push({ out, len });
}

// Join the parts with a fade.
let chain = '', acc = parts[0].len, last = '0:v';
parts.slice(1).forEach((part, i) => {
  const tag = `x${i}`;
  chain += `${chain ? ';' : ''}[${last}][${i + 1}:v]xfade=transition=${config.transition.kind}:duration=${T}:offset=${(acc - T).toFixed(3)}[${tag}]`;
  acc += part.len - T; last = tag;
});
const final = p('build', `${id}.mp4`);
const video = [...parts.flatMap((part) => ['-i', part.out])];
const vmap = parts.length > 1 ? ['-filter_complex', chain, '-map', `[${last}]`] : ['-map', '0:v'];
const enc = ['-c:v', 'libx264', '-crf', String(crf), '-preset', 'medium', '-pix_fmt', 'yuv420p', '-t', String(length), '-movflags', '+faststart'];

const mp3 = p('audio', `${id}.mp3`);
if (!L.lines || !fs.existsSync(mp3)) {
  ff([...video, ...vmap, ...enc, final]);
} else {
  // The voice, with silence put in before the lines that have a gap. The cut
  // lands in the middle of the real pause before each such line (measured,
  // not taken from the alignment, which runs late), with a short fade either
  // side, so no sliver of the next word gets through.
  let voice = mp3;
  const gapLines = L.lines.filter((l, i) => i > 0 && l.shift !== L.lines[i - 1].shift);
  if (gapLines.length) {
    const det = execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${mp3}" -af silencedetect=noise=-42dB:d=0.08 -f null - 2>&1`]).toString();
    const quiet = [...det.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const cuts = gapLines.map((l) => {
      const prev = L.lines[l.i - 1];
      const from = prev.end - prev.shift, to = l.start - l.shift;
      const best = quiet.filter(([qs, qe]) => qe > from - 0.15 && qs < to + 0.15).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0];
      // The voice comes first: a pause goes only into a real silence, never
      // across a word. No silence there, no pause: stop and say which line.
      if (!best || best[1] - best[0] < 0.12) throw new Error(`no pause in the voice before line ${l.i} ("${l.text?.slice(0, 40) ?? ''}"): move the gap to another line`);
      return { at: (best[0] + best[1]) / 2, gap: l.shift - prev.shift };
    });
    const F = 0.012;
    let f = '', prev = 0, n = 0;
    for (const c of cuts) {
      const len = c.at - prev;
      f += `[0:a]atrim=${prev}:${c.at},asetpts=PTS-STARTPTS,afade=t=in:d=${n ? F : 0.001},afade=t=out:st=${(len - F).toFixed(3)}:d=${F}[p${n}];anullsrc=r=44100:cl=mono,atrim=0:${c.gap}[s${n}];`;
      prev = c.at; n++;
    }
    f += `[0:a]atrim=${prev},asetpts=PTS-STARTPTS,afade=t=in:d=${F}[p${n}];`;
    f += cuts.map((_, i) => `[p${i}][s${i}]`).join('') + `[p${n}]concat=n=${2 * n + 1}:v=0:a=1[a]`;
    voice = p('build', `${id}-voice.wav`);
    ff(['-i', mp3, '-filter_complex', f, '-map', '[a]', voice]);
    console.log('gaps cut at', cuts.map((c) => c.at.toFixed(2)).join(' '));
    let added = 0;
    cuts.forEach((c, i) => {
      const line = gapLines[i];
      report.gaps.push(`${tc(c.at + added)}: ${c.gap.toFixed(1)} s of pause before line ${line.i} ("${(line.text ?? '').slice(0, 60)}"), in the voice's own silence there`);
      added += c.gap;
    });
  }
  ff([...video, '-i', voice, ...vmap, '-map', `${parts.length}:a`, ...enc, '-c:a', 'aac', '-b:a', '256k', final]);
}
// The report beside the video. The facts are written here; whoever made the
// video adds what they decided (see the screen skill, "The report").
{
  const file = p('build', `${id}.report.md`);
  const lines = [`# ${id}: report`, '', `Length ${tc(length)}.`, '', '## The voice', ''];
  if (!fs.existsSync(p('audio', `${id}.mp3`))) lines.push('No voice.');
  else lines.push(report.gaps.length ? 'Pauses added (nothing else in the voice was changed):' : 'The voice is untouched: no pauses added.', '', ...report.gaps.map((g) => `- ${g}`));
  lines.push('', '## Needs a look', '');
  const notes = report.notes.sort((x, y) => x[0] - y[0]);
  lines.push(...(notes.length ? notes.map(([t, m]) => `- ${tc(t)}: ${m}`) : ['Nothing went wrong on the take.']));
  lines.push('', '## Decisions', '', '(Added by whoever made the video: what they chose that the script did not say.)', '');
  fs.writeFileSync(file, lines.join('\n'));
  console.log('report', file);
}
console.log(final, execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', final]).toString().trim());
