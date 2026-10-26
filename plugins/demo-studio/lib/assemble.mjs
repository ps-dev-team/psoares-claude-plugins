// node assemble.mjs <project> <id> [--draft]: the recorded segments ->
// build/<id>.mp4. --draft makes build/<id>.draft.mp4 instead: a third of the
// size, no motion blur, a few times faster, for the review page (review.mjs)
// before the full render.
//
// Each window's clip is redrawn by the camera (Remotion: the large pointer and
// the spring zoom), or, with pointer.mode "page", taken from its frames as
// they are. One window fills the frame; two sit in the plain browser frame.
// Segments are joined with a fade, and the voice goes under, with silence cut
// in where the beats asked for gaps. Without a voice the video is silent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadProject, loadVideo } from './project.mjs';
import { cursorImages, cameraDir, frameBoxes, partsOf, cameraProps, voiceCuts, timelineOf } from './parts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [dir, id, flag] = process.argv.slice(2);
if (!dir || !id) { console.error('usage: node assemble.mjs <project> <id> [--draft]'); process.exit(2); }
const DRAFT = flag === '--draft';
const D = DRAFT ? 1 / 3 : 1; // the draft's scale
const even = (n) => Math.round(n * D / 2) * 2;
const tag = DRAFT ? '.draft' : '';
const project = loadProject(dir);
const { config, p } = project;
const { L, segments, length } = await loadVideo(project, id);
const W = even(config.output.width), H = even(config.output.height);
const { fps } = config.output;
const crf = DRAFT ? 26 : config.output.crf;
const T = config.transition.seconds;
const drawn = config.pointer.mode !== 'page';
const images = cursorImages(config);
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

// Renders one window's clip at w x h with the camera (the same props the live
// preview plays).
function camera(win, part, w, h, out) {
  const props = cameraProps(config, win, part, { w, h, fps, draft: DRAFT, images });
  const propsFile = path.join(win.dir, `camera-${part.from.toFixed(2)}.json`);
  fs.writeFileSync(propsFile, JSON.stringify(props));
  execFileSync('npx', ['remotion', 'render', 'src/index.ts', 'Camera', out, `--props=${propsFile}`, `--public-dir=${win.dir}`,
    '--codec=h264', `--crf=${Math.max(1, crf - 1)}`, `--concurrency=${config.camera.concurrency}`, '--log=error'],
  { cwd: cameraDir(), stdio: 'inherit' });
}

// The report: what was done to the voice and what went wrong on the take,
// with the time in the finished video, so the user knows where to look.
const report = { notes: [], gaps: [] };
const tc = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const parts = [];
const all = partsOf(project, id, { segments, length });
for (const part of all) {
  const { k, windows, len } = part;
  for (const win of windows) for (const [t, msg] of win.meta.notes ?? []) report.notes.push([t, `${part.name}: ${msg}`]);
  const out = p('build', `${id}-${k}${tag}.mp4`);
  const boxes = part.framed ? frameBoxes(project, windows.length, D) : null;
  const size = (i) => (boxes ? [boxes[i].w, boxes[i].h] : [W, H]);
  // Each window's clip, already at the size it is shown at.
  const clips = windows.map((win, i) => {
    const clip = p('build', `${id}-${k}-w${i}${tag}.mp4`);
    const [w, h] = size(i);
    if (drawn) camera(win, part, w, h, clip);
    else ff(['-f', 'concat', '-safe', '0', '-i', path.join(win.dir, 'list.txt'), '-vf',
      `fps=${fps},trim=${part.from}:${part.from + len},setpts=PTS-STARTPTS,scale=${w}:${h}:flags=lanczos,setsar=1`, '-c:v', 'libx264', '-crf', String(crf - 1), clip]);
    return clip;
  });
  if (!boxes) {
    ff(['-i', clips[0], '-vf', `scale=${W}:${H}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', String(crf), '-t', String(len), out]);
  } else {
    const n = windows.length;
    const inputs = [...clips.flatMap((c) => ['-i', c]), '-loop', '1', '-i', p('frame', `back-${n}.png`), '-loop', '1', '-i', p('frame', `front-${n}.png`)];
    let f = `[${n}:v]fps=${fps},scale=${W}:${H}[s0];[${n + 1}:v]scale=${W}:${H}[fr]`;
    clips.forEach((_, i) => { f += `;[s${i}][${i}:v]overlay=${boxes[i].x}:${boxes[i].y}[s${i + 1}]`; });
    f += `;[s${n}][fr]overlay=0:0,format=yuv420p[v]`;
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
const final = p('build', `${id}${tag}.mp4`);
const video = [...parts.flatMap((part) => ['-i', part.out])];
const vmap = parts.length > 1 ? ['-filter_complex', chain, '-map', `[${last}]`] : ['-map', '0:v'];
const enc = ['-c:v', 'libx264', '-crf', String(crf), '-preset', DRAFT ? 'veryfast' : 'medium', '-pix_fmt', 'yuv420p', '-t', String(length), '-movflags', '+faststart'];

const mp3 = p('audio', `${id}.mp3`);
if (!L.lines || !fs.existsSync(mp3)) {
  ff([...video, ...vmap, ...enc, final]);
} else {
  // The voice, with silence put in before the lines that have a gap. The cut
  // lands in the middle of the real pause before each such line (measured,
  // not taken from the alignment, which runs late), with a short fade either
  // side, so no sliver of the next word gets through.
  let voice = mp3;
  const { gapLines, cuts } = voiceCuts(mp3, L);
  if (gapLines.length) {
    const F = 0.012;
    let f = '', prev = 0, n = 0;
    for (const c of cuts) {
      const len = c.at - prev;
      f += `[0:a]atrim=${prev}:${c.at},asetpts=PTS-STARTPTS,afade=t=in:d=${n ? F : 0.001},afade=t=out:st=${(len - F).toFixed(3)}:d=${F}[p${n}];anullsrc=r=44100:cl=mono,atrim=0:${c.gap}[s${n}];`;
      prev = c.at; n++;
    }
    f += `[0:a]atrim=${prev},asetpts=PTS-STARTPTS,afade=t=in:d=${F}[p${n}];`;
    f += cuts.map((_, i) => `[p${i}][s${i}]`).join('') + `[p${n}]concat=n=${2 * n + 1}:v=0:a=1[a]`;
    voice = p('build', `${id}-voice${tag}.wav`);
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
// Loudness: the finished video goes to a standard level (audio.loudness LUFS,
// -16 by default; false leaves it as mixed). Players in apps do not normalize
// and platforms only turn loud files down, so a quiet voice would stay quiet.
// Drafts skip it: they are for looking, and the full render does it.
const loud = config.audio?.loudness ?? -16;
if (!DRAFT && loud !== false && fs.existsSync(mp3) && L.lines) {
  const tmp = p('build', `${id}.loud.mp4`);
  const out = execFileSync('python3', [path.join(HERE, 'normalize.py'), final, tmp, '--target', String(loud)], { encoding: 'utf8' });
  fs.renameSync(tmp, final);
  console.log('loudness', out.trim());
  report.loudness = out.trim().replace(/^[^:]+: /, '');
}
// The report beside the video. The facts are written here; whoever made the
// video adds what they decided (see the screen skill, "The report").
{
  const file = p('build', `${id}.report.md`);
  const lines = [`# ${id}: report`, '', `Length ${tc(length)}.`, '', '## The voice', ''];
  if (!fs.existsSync(p('audio', `${id}.mp3`))) lines.push('No voice.');
  else lines.push(report.gaps.length ? 'Pauses added:' : 'No pauses added.', '', ...report.gaps.map((g) => `- ${g}`));
  if (report.loudness) lines.push('', `Loudness: ${report.loudness}.`);
  lines.push('', '## Needs a look', '');
  const notes = report.notes.sort((x, y) => x[0] - y[0]);
  lines.push(...(notes.length ? notes.map(([t, m]) => `- ${tc(t)}: ${m}`) : ['Nothing went wrong on the take.']));
  // The Decisions are written by hand: a re-render keeps them.
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const kept = old.includes('\n## Decisions\n') ? old.slice(old.indexOf('\n## Decisions\n') + 1).trimEnd() : '';
  lines.push('', kept && !kept.includes('(Added by whoever made the video') ? kept : '## Decisions\n\n(Added by whoever made the video: what they chose that the script did not say.)', '');
  fs.writeFileSync(file, lines.join('\n'));
  console.log('report', file);
}
// The timeline beside the video, read by the review page.
{
  const mp3f = p('audio', `${id}.mp3`);
  const vc = L.lines && fs.existsSync(mp3f) ? voiceCuts(mp3f, L) : { gapLines: [], cuts: [] };
  const timeline = timelineOf(id, length, all, L, vc.cuts, vc.gapLines);
  timeline.video = path.basename(final);
  fs.writeFileSync(p('build', `${id}${tag}.timeline.json`), JSON.stringify(timeline));
}
console.log(final, execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', final]).toString().trim());
