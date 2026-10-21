// A video project: one folder with video.config.json, the scripts, the voice,
// the beats, and what the recorder and the assembler write.
//
//   video.config.json   the app, accounts, sizes, voice, frame (see config.example.json)
//   context.md          what the app is, for whoever writes the beats (optional)
//   scripts/<id>.md     the script the voice reads
//   audio/<id>.*        the voice and its timings
//   videos/<id>.mjs     the beats: what happens on screen, and when
//   raw/ build/ frame/  recordings, renders, the browser frame layers
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const DEFAULTS = {
  app: { base: '', locale: 'en-GB', dismiss: [], windowX: 2600 },
  accounts: {},
  view: { width: 2048, height: 1152 },
  output: { width: 3840, height: 2160, fps: 60, crf: 17 },
  transition: { kind: 'fadewhite', seconds: 0.7, pad: 0.5 },
  frame: { address: '', stage: '#f5f6fc', gap: 40, single: false },
  pointer: { mode: 'drawn', size: 34 },
  camera: { zoom: 2, concurrency: 4, blur: { shutter: 180, samples: 12 } },
  voice: {
    model: 'eleven_v4', format: 'mp3_44100_192',
    settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1 },
  },
};

const merge = (a, b) => {
  if (Array.isArray(a) || typeof a !== 'object' || a === null) return b ?? a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b ?? {})) out[k] = k in a ? merge(a[k], v) : v;
  return out;
};

export function loadProject(dir = process.env.VIDEO_PROJECT || process.cwd()) {
  const root = path.resolve(dir);
  const file = path.join(root, 'video.config.json');
  if (!fs.existsSync(file)) throw new Error(`no video.config.json in ${root}`);
  const config = merge(DEFAULTS, JSON.parse(fs.readFileSync(file, 'utf8')));
  const p = (...parts) => path.join(root, ...parts);
  for (const d of ['audio', 'raw', 'build', 'frame']) fs.mkdirSync(p(d), { recursive: true });
  return { root, config, p };
}

// Playwright from the project, or from the path the config names.
export function playwright(project) {
  const tries = [project.config.playwright, path.join(project.root, 'package.json')].filter(Boolean);
  for (const t of tries) {
    try { return createRequire(t.endsWith('.json') ? t : path.join(t, 'x.js'))('playwright'); } catch {}
  }
  throw new Error('Playwright not found: run `pnpm add -D playwright` in the project, or set "playwright" in video.config.json to a folder that has it');
}

// The timings of a voiced video: L(i) is line i's start, L(i, 'word') a word's.
// `gaps` ({ line: seconds }) puts silence before those lines, for a screen that
// needs longer than the voice gives it; every later time moves with it.
// Without a voice (B-roll), pass `lines: null` and use plain seconds.
export function timings(project, id, gaps = {}) {
  const file = project.p('audio', `${id}.lines.json`);
  if (!fs.existsSync(file)) {
    const L = (s) => { if (typeof s !== 'number') throw new Error(`no voice for ${id}: beats use seconds`); return s; };
    L.lines = null; L.end = () => 0;
    return L;
  }
  const lines = JSON.parse(fs.readFileSync(file, 'utf8'));
  let shift = 0;
  for (const line of lines) {
    shift += gaps[line.i] ?? 0;
    line.shift = shift;
    line.start += shift; line.end += shift;
    line.words = line.words.map(([w, t]) => [w, t + shift]);
  }
  const L = (i, word, nth = 0) => {
    const line = lines[i];
    if (!line) throw new Error(`no line ${i}`);
    if (word === undefined) return line.start;
    const norm = (s) => s.toLowerCase().replace(/[’']/g, "'");
    const hits = line.words.filter(([w]) => norm(w) === norm(word));
    if (!hits[nth]) throw new Error(`no word "${word}" in line ${i}: ${line.text}`);
    return hits[nth][1];
  };
  L.end = (i) => lines[i].end;
  L.lines = lines;
  return L;
}

// Where a video's beats live, loaded with its timings and segments.
export async function loadVideo(project, id) {
  const mod = await import(project.p('videos', `${id}.mjs`));
  const L = timings(project, id, mod.gaps);
  const length = mod.length ?? (L.lines ? L.lines.at(-1).end + 1.2 : null);
  if (length == null) throw new Error(`videos/${id}.mjs: a video without a voice exports its length in seconds`);
  return { mod, L, length, segments: mod.segments(L) };
}
