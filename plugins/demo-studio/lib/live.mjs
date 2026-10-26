// The live preview's two halves on the server: the browser bundle (Remotion's
// Player on the same Camera the render uses, built once with esbuild into the
// camera's cache folder) and the props of a video, computed by parts.mjs from
// the same recordings, frame and voice as assemble.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { loadVideo } from './project.mjs';
import { cameraDir, cursorImages, frameBoxes, partsOf, cameraProps, voiceCuts, voicePieces, timelineOf } from './parts.mjs';

const run = promisify(execFile);

// The bundle, rebuilt when the camera's source changes.
let building = null;
export async function liveBundle() {
  const cam = cameraDir();
  const out = path.join(cam, 'live.js');
  const src = path.join(cam, 'src');
  const newest = Math.max(...fs.readdirSync(src).map((f) => fs.statSync(path.join(src, f)).mtimeMs));
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs > newest) return out;
  // esbuild's own API, from the camera's folder (its command-line shim is not
  // reliable across package managers).
  const esbuild = createRequire(path.join(cam, 'package.json'))('esbuild');
  building ??= esbuild.build({ entryPoints: [path.join(src, 'live-entry.tsx')], bundle: true, format: 'iife', minify: true, jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' }, outfile: out, logLevel: 'error', absWorkingDir: cam })
    .finally(() => { building = null; });
  await building;
  return out;
}

// Does a video have its recordings? (Every window of every segment.)
export async function hasRecordings(project, id) {
  try {
    const { segments } = await loadVideo(project, id, { fresh: true });
    return segments.every((s) => s.windows.every((w) => fs.existsSync(project.p('raw', `${id}-${s.name}-${w.account ?? 'anon'}`, 'pointer.json'))));
  } catch { return false; }
}

// The live props, in the page's URLs. The preview plays at 1920 wide, the
// draft's job at the size a laptop shows; the layout scales with it.
// Kept until the beats, the voice, its timings or a recording change: the
// page asks every few seconds, and measuring the voice's pauses is not free.
const cache = new Map();
const stamp = (project, id) => {
  const { p } = project;
  const files = [p('videos', `${id}.mjs`), p('audio', `${id}.mp3`), p('audio', 'timings', `${id}.lines.json`), p('video.config.json')];
  const raws = fs.existsSync(p('raw')) ? fs.readdirSync(p('raw')).filter((d) => d.startsWith(`${id}-`)).map((d) => p('raw', d, 'pointer.json')) : [];
  return [...files, ...raws].map((f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0)).join(',');
};
export async function liveProps(project, id) {
  const key = stamp(project, id);
  if (cache.get(id)?.key === key) return cache.get(id).value;
  const value = await computeLive(project, id);
  cache.set(id, { key, value });
  return value;
}

async function computeLive(project, id) {
  const { config, p } = project;
  const { L, segments, length } = await loadVideo(project, id, { fresh: true });
  const D = Math.min(1, 1920 / config.output.width);
  const even = (n) => Math.round(n * D / 2) * 2;
  const W = even(config.output.width), H = even(config.output.height), fps = config.output.fps;
  const images = cursorImages(config);
  const parts = partsOf(project, id, { segments, length });
  const unsupported = [];
  if (config.pointer.mode === 'page') unsupported.push('pointer.mode "page": the live preview draws the pointer anyway');
  if (!['fade', 'fadewhite', 'fadeblack'].includes(config.transition.kind)) unsupported.push(`transition "${config.transition.kind}" is shown as a cross-fade`);
  const live = parts.map((part) => {
    const n = part.windows.length;
    const boxes = part.framed ? frameBoxes(project, n, D) : null;
    return {
      a: part.a, len: part.len, framed: part.framed,
      back: boxes ? `/framefile/back-${n}.png` : undefined, front: boxes ? `/framefile/front-${n}.png` : undefined,
      windows: part.windows.map((win, i) => {
        const [w, h] = boxes ? [boxes[i].w, boxes[i].h] : [W, H];
        // Draft settings: no motion blur on the camera (it is off by default anyway).
        const props = cameraProps(config, win, part, { w, h, fps, draft: true, images });
        props.pointer.blur = config.pointer.blur !== false;
        return { box: boxes ? { x: boxes[i].x, y: boxes[i].y, w, h } : null, props: { ...props, base: `/raw/${encodeURIComponent(win.name)}/` } };
      }),
    };
  });
  const mp3 = p('audio', `${id}.mp3`);
  let voice = null, vc = { gapLines: [], cuts: [] };
  if (L.lines && fs.existsSync(mp3)) {
    vc = voiceCuts(mp3, L);
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3]);
    voice = { src: `/voice?v=${encodeURIComponent(id)}`, pieces: voicePieces(vc.cuts, +stdout) };
  }
  const timeline = timelineOf(id, length, parts, L, vc.cuts, vc.gapLines);
  return { props: { fps, width: W, height: H, length, transition: config.transition, parts: live, voice }, timeline, unsupported };
}
