// What a video is made of, computed once for both the render (assemble.mjs)
// and the live preview (review.mjs): the parts in order with their windows and
// spans, the camera inputs of each window, the frame boxes, the cursor set,
// where the voice gets its pauses, and the review timeline. The two read the
// same numbers, so the preview is the render.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// The cursor set: SVGs named <shape>-1__<x>-<y>.svg, x and y the hot spot in
// percent (Screen Studio's own format, so its sets can be copied out of the
// app). config.pointer.cursors names the folder; without one the pointer is
// drawn. The default set lives in ~/.config/demo-studio; the plugin's old name,
// ~/.config/psoares-video, is still read so older setups keep their cursors.
export function cursorImages(config) {
  const dir = [config.pointer.cursors, '~/.config/demo-studio/cursors/macos-tahoe', '~/.config/psoares-video/cursors/macos-tahoe']
    .filter(Boolean).map((d) => d.replace(/^~/, process.env.HOME)).find((d) => fs.existsSync(d));
  if (!dir) return null;
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

// The camera project, installed once outside the plugin (plugin folders are
// replaced on update). Under the plugin's old name it was
// ~/.cache/psoares-video/camera; that copy is no longer used.
export function cameraDir() {
  const dest = path.join(os.homedir(), '.cache', 'demo-studio', 'camera');
  const src = path.join(HERE, 'camera');
  const stamp = fs.readFileSync(path.join(src, 'package.json'), 'utf8');
  const have = fs.existsSync(path.join(dest, 'package.json')) && fs.readFileSync(path.join(dest, 'package.json'), 'utf8') === stamp;
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(path.join(src, 'src'), path.join(dest, 'src'), { recursive: true });
  // pnpm 10 runs no build script it was not told to allow (esbuild needs its own).
  fs.copyFileSync(path.join(src, 'pnpm-workspace.yaml'), path.join(dest, 'pnpm-workspace.yaml'));
  if (!have || !fs.existsSync(path.join(dest, 'node_modules'))) {
    fs.writeFileSync(path.join(dest, 'package.json'), stamp);
    console.log('installing the camera (once)…');
    execFileSync('pnpm', ['install', '--silent'], { cwd: dest, stdio: 'inherit' });
  }
  return dest;
}

// The frame boxes for n windows, in output pixels at scale D (drawn once into
// frame/ by frame_layers.py).
export function frameBoxes(project, n, D = 1) {
  const even = (v) => Math.round(v * D / 2) * 2;
  const bf = project.p('frame', `boxes-${n}.json`);
  if (!fs.existsSync(bf)) execFileSync('python3', [path.join(HERE, 'frame_layers.py'), project.root, String(n)], { stdio: 'inherit' });
  return readJson(bf).map((bx) => ({ x: Math.round(bx.x * D), y: Math.round(bx.y * D), w: even(bx.w), h: even(bx.h) }));
}

// The parts of a video in order. Each part is a segment's span in voice time,
// overlapping its neighbours by half a fade; in the finished video a part
// starts at its voice time `a` (the fades take up the overlap).
export function partsOf(project, id, { segments, length }) {
  const { config, p } = project;
  const T = config.transition.seconds;
  return segments.map((s, k) => {
    const windows = s.windows.map((spec) => {
      const dir = p('raw', `${id}-${s.name}-${spec.account ?? 'anon'}`);
      return { dir, name: path.basename(dir), meta: readJson(path.join(dir, 'meta.json')), ptr: readJson(path.join(dir, 'pointer.json')) };
    });
    const a = k === 0 ? 0 : s.start - T / 2;
    const b = k === segments.length - 1 ? length : segments[k + 1].start + T / 2;
    return { k, name: s.name, segStart: k === 0 ? 0 : s.start, a, b, from: a - windows[0].meta.start, len: b - a, windows, framed: windows.length === 2 || !!config.frame.single };
  });
}

// The props the camera draws one window's clip from.
export function cameraProps(config, win, part, { w, h, fps, draft, images }) {
  return {
    fps, width: w, height: h, from: part.from, duration: part.len, view: win.meta.view,
    frames: win.meta.frames, moves: win.ptr.moves, presses: win.ptr.presses, zooms: win.ptr.zooms, marks: win.ptr.marks ?? [],
    pointer: { size: config.pointer.size, show: true, blur: !draft && config.pointer.blur !== false, marquee: config.pointer.marquee ?? '#0a84ff', images },
    blur: draft ? { ...config.camera.blur, samples: 0 } : config.camera.blur,
  };
}

// Where the voice gets the silence of each gap: the middle of the real pause
// before the line (measured, not taken from the alignment, which runs late).
// The voice comes first: a pause goes only into a real silence, never across
// a word. No silence there: stop and say which line.
export function voiceCuts(mp3, L) {
  const gapLines = (L.lines ?? []).filter((l, i) => i > 0 && l.shift !== L.lines[i - 1].shift);
  if (!gapLines.length) return { gapLines, cuts: [] };
  const det = execFileSync('sh', ['-c', `ffmpeg -hide_banner -i "${mp3}" -af silencedetect=noise=-42dB:d=0.08 -f null - 2>&1`]).toString();
  const quiet = [...det.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
  const cuts = gapLines.map((l) => {
    const prev = L.lines[l.i - 1];
    const from = prev.end - prev.shift, to = l.start - l.shift;
    const best = quiet.filter(([qs, qe]) => qe > from - 0.15 && qs < to + 0.15).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))[0];
    if (!best || best[1] - best[0] < 0.12) throw new Error(`no pause in the voice before line ${l.i} ("${l.text?.slice(0, 40) ?? ''}"): move the gap to another line`);
    return { at: (best[0] + best[1]) / 2, gap: l.shift - prev.shift };
  });
  return { gapLines, cuts };
}

// The voice as pieces on the video's clock: [source from, source to, video at],
// silence between them where the gaps are.
export function voicePieces(cuts, total) {
  const out = [];
  let prev = 0, added = 0;
  for (const c of cuts) { out.push({ from: prev, to: c.at, at: prev + added }); added += c.gap; prev = c.at; }
  out.push({ from: prev, to: total, at: prev + added });
  return out;
}

// The review timeline, everything in finished-video seconds.
export function timelineOf(id, length, parts, L, cuts, gapLines) {
  const timeline = { id, length, segments: [], lines: [], gaps: [], zooms: [], clicks: [], events: [], notes: [] };
  for (const part of parts) {
    timeline.segments.push({ name: part.name, start: part.segStart });
    for (const win of part.windows) {
      const at = (t) => t + win.meta.start, inside = (t) => t >= part.a && t < part.b;
      for (const [t, msg] of win.meta.notes ?? []) timeline.notes.push([t, `${part.name}: ${msg}`]);
      for (const z of win.ptr.zooms ?? []) if (inside(at(z.t))) timeline.zooms.push({ t: +at(z.t).toFixed(2), scale: z.scale });
      for (const [t, down] of win.ptr.presses ?? []) if (down && inside(at(t))) timeline.clicks.push(+at(t).toFixed(2));
      for (const [t, kind] of win.ptr.events ?? []) if (inside(at(t))) timeline.events.push([+at(t).toFixed(2), kind]);
      for (const mk of win.ptr.marks ?? []) if (inside(at(mk.t0))) timeline.events.push([+at(mk.t0).toFixed(2), 'box']);
    }
  }
  let added = 0;
  (cuts ?? []).forEach((c, i) => {
    timeline.gaps.push({ t: +(c.at + added).toFixed(2), seconds: c.gap, line: gapLines[i].i });
    added += c.gap;
  });
  timeline.lines = (L.lines ?? []).map((l) => ({ i: l.i, text: l.text, start: l.start, end: l.end }));
  timeline.notes.sort((x, y) => x[0] - y[0]);
  return timeline;
}
