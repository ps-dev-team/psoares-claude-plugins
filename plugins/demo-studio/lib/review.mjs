// node review.mjs <project> [id] [--wait]: the review page for a project's
// videos, local only (127.0.0.1). The list on the left holds every video (a
// beats file or a voice) with what exists for it; `/?v=<id>` opens one. It
// plays the newest render (build/<id>.mp4 or build/<id>.draft.mp4), or, once a
// video is recorded, a live preview with no render at all: the recordings put
// together in the browser by the same camera the render uses (live.mjs). Before
// any recording it plays the plain voice with the plan, over a timeline of the script lines, the scenes
// and the specials (zooms, gestures, drags, typing, clicks, pauses). A comment
// is pinned to a moment and saved, with a still of that frame, to
// review/<id>.json and review/<id>-<n>.jpg. "Send to Claude" marks the new
// comments `sent`. Whoever makes the video reads the file, answers each
// comment there (`done` or `answered`, with a `reply`), and the page shows
// the answers. With an id, the browser opens on that video.
//
// The server stops on its own after IDLE_MIN minutes (default 30) with no
// page open, so a forgotten one does not stay up. Stop it yourself when the
// review is done.
//
// The ✓ Approve button records the user's approval of the video on screen in
// review/<id>.json (`approved`, and every change in `approvals`). It belongs to
// that render: a newer one shows it as given to an older version.
//
// --wait starts no page: it waits for the next send or approval (of <id>, or of any video
// when no id is given), prints the comments sent, and exits. Run it in the
// background beside the page, so the send wakes whoever is waiting.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadProject } from './project.mjs';
import { liveBundle, liveProps, hasRecordings } from './live.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const waiting = args.includes('--wait');
const [dir, only] = args.filter((a) => !a.startsWith('--'));
if (!dir) { console.error('usage: node review.mjs <project> [id] [--wait]'); process.exit(2); }
const project = loadProject(dir);
const { p } = project;
fs.mkdirSync(p('review'), { recursive: true });

// A video id is a file name and nothing else, so no other path can be asked for.
const safe = (id) => (typeof id === 'string' && /^[\w.-]+$/.test(id) ? id : null);
const exists = (f) => fs.existsSync(f);
const pick = (...names) => names.map((n) => p('build', n)).find(exists);
// The render to show: the newest of the full render and the draft, so an old
// draft never hides a newer full render.
const renders = (id) => [[`${id}.mp4`, 'full'], [`${id}.draft.mp4`, 'draft']]
  .map(([n, kind]) => ({ file: p('build', n), kind })).filter((r) => exists(r.file))
  .sort((a, b) => fs.statSync(b.file).mtimeMs - fs.statSync(a.file).mtimeMs);
const render = (id) => renders(id)[0] ?? null;
const video = (id) => render(id)?.file;
// Before any recording: the plain voice, so the plan can be heard.
const voice = (id) => [p('audio', `${id}.mp3`)].find(exists);
const plan = (id) => pick(`${id}.plan.json`);
// The timeline written with the render on screen.
const timeline = (id) => { const r = render(id); return r ? pick(r.kind === 'draft' ? `${id}.draft.timeline.json` : `${id}.timeline.json`) : null; };
const store = (id) => p('review', `${id}.json`);
const read = (id) => (exists(store(id)) ? JSON.parse(fs.readFileSync(store(id), 'utf8')) : { id, comments: [] });
const write = (id, d) => fs.writeFileSync(store(id), JSON.stringify(d, null, 2) + '\n');
const tc = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

// Every video of the project: a beats file in videos/, or a voice in audio/.
const ids = () => {
  const from = (sub, re) => (exists(p(sub)) ? fs.readdirSync(p(sub)).map((f) => f.match(re)?.[1]).filter(Boolean) : []);
  return [...new Set([...from('videos', /^([\w-]+)\.mjs$/), ...from('audio', /^([\w-]+)\.mp3$/)])].sort();
};
// A file's length in seconds, kept until the file changes.
const lengths = new Map();
const lengthOf = (f) => {
  const key = `${f}:${fs.statSync(f).mtimeMs}`;
  if (!lengths.has(key)) {
    try { lengths.set(key, +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()); } catch { lengths.set(key, null); }
  }
  return lengths.get(key);
};
// "// 03 Ferramentas: the library…" names the video "Ferramentas".
const titleOf = (id) => {
  const f = p('videos', `${id}.mjs`);
  if (!exists(f)) return null;
  const first = fs.readFileSync(f, 'utf8').split('\n')[0];
  return first.replace(/^\/\/\s*/, '').replace(new RegExp(`^${id}\\s+`), '').split(/[:.(]/)[0].trim() || null;
};
// The user's approval, against the video it was given on: 'yes', 'older'
// (a newer render came after it), or null.
const approvalOf = (id) => {
  const a = read(id).approved, v = video(id);
  if (!a) return null;
  return v && Math.round(fs.statSync(v).mtimeMs) === a.mtime ? 'yes' : 'older';
};
const list = () => ids().map((id) => {
  const draft = pick(`${id}.draft.mp4`), final = pick(`${id}.mp4`), cs = read(id).comments;
  const count = (...st) => cs.filter((c) => st.includes(c.status)).length;
  const shown = video(id) ?? voice(id);
  return {
    id, title: titleOf(id), test: !voice(id),
    has: { voice: !!voice(id), plan: !!plan(id), draft: !!draft, final: !!final },
    length: shown ? lengthOf(shown) : null,
    updated: shown ? fs.statSync(shown).mtimeMs : null,
    comments: { open: count('open'), sent: count('sent'), done: count('done', 'answered') },
    approved: approvalOf(id),
  };
});

if (waiting) {
  const watched = only ? [only] : ids();
  const seen = Object.fromEntries(watched.map((id) => [id, (read(id).sends ?? []).length]));
  const approvals = Object.fromEntries(watched.map((id) => [id, (read(id).approvals ?? []).length]));
  for (;;) {
    for (const id of watched) {
      const d = read(id), sends = d.sends ?? [];
      const ap = d.approvals ?? [];
      if (ap.length > approvals[id]) {
        const a = ap.at(-1);
        console.log(`review ${id}: ${a.approved ? 'APPROVED' : 'approval withdrawn'} at ${a.at} (${a.video})`);
        process.exit(0);
      }
      if (sends.length <= seen[id]) continue;
      const send = sends.at(-1);
      console.log(`review ${id}: ${send.comments.length} comment(s) sent at ${send.at}`);
      for (const n of send.comments) {
        const c = d.comments.find((x) => x.n === n);
        if (c) console.log(`#${c.n} ${tc(c.t)} ${c.text.replace(/\n/g, ' / ')}${c.still ? `  [${c.still}]` : ''}`);
      }
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b ? JSON.parse(b) : {})); });
const json = (res, d) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };
const none = (res, code = 404) => { res.writeHead(code); res.end(); };

// The video with Range support, so the player can seek.
function stream(req, res, file) {
  const size = fs.statSync(file).size, type = file.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4';
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (!m) { res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' }); fs.createReadStream(file).pipe(res); return; }
  const start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1, 'accept-ranges': 'bytes' });
  fs.createReadStream(file, { start, end }).pipe(res);
}

let last = Date.now();
const server = http.createServer(async (req, res) => {
  last = Date.now();
  const url = new URL(req.url, 'http://x');
  const id = safe(url.searchParams.get('v'));
  try {
    if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(HERE, 'review.html'))); return; }
    if (url.pathname === '/list') { json(res, { project: path.basename(path.resolve(dir)), videos: list() }); return; }
    if (url.pathname.startsWith('/still/')) {
      const f = p('review', path.basename(url.pathname));
      if (!exists(f)) { none(res); return; }
      res.writeHead(200, { 'content-type': 'image/jpeg' }); fs.createReadStream(f).pipe(res); return;
    }
    if (url.pathname === '/live/bundle.js') {
      const f = await liveBundle();
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache' }); fs.createReadStream(f).pipe(res); return;
    }
    // A recording's frames, and the frame layers, for the live preview.
    if (url.pathname.startsWith('/raw/')) {
      const [, , folder, file] = url.pathname.split('/').map(decodeURIComponent);
      const f = safe(folder) && safe(file) ? p('raw', folder, file) : null;
      if (!f || !exists(f)) { none(res); return; }
      res.writeHead(200, { 'content-type': file.endsWith('.png') ? 'image/png' : 'image/jpeg', 'cache-control': 'max-age=3600' }); fs.createReadStream(f).pipe(res); return;
    }
    if (url.pathname.startsWith('/framefile/')) {
      const file = safe(decodeURIComponent(path.basename(url.pathname)));
      const f = file ? p('frame', file) : null;
      if (!f || !exists(f)) { none(res); return; }
      res.writeHead(200, { 'content-type': 'image/png' }); fs.createReadStream(f).pipe(res); return;
    }
    if (!id) { none(res, 400); return; }
    if (url.pathname === '/voice') { const f = voice(id); if (!f) { none(res); return; } stream(req, res, f); return; }
    if (url.pathname === '/live/data') {
      try { json(res, await liveProps(project, id)); } catch (e) { json(res, { error: String(e.message ?? e) }); }
      return;
    }
    if (url.pathname === '/video') { const f = video(id) ?? voice(id); if (!f) { none(res); return; } stream(req, res, f); return; }
    if (url.pathname === '/data') {
      const f = timeline(id), v = video(id) ?? voice(id), pl = plan(id);
      const live = await hasRecordings(project, id);
      json(res, { id, title: titleOf(id), approved: approvalOf(id), video: v && path.basename(v), kind: render(id)?.kind ?? null, live, voiceOnly: !video(id) && !live, mtime: v && fs.statSync(v).mtimeMs, timeline: video(id) && f ? JSON.parse(fs.readFileSync(f, 'utf8')) : null, plan: pl ? JSON.parse(fs.readFileSync(pl, 'utf8')) : null, review: read(id) });
      return;
    }
    if (url.pathname === '/comment' && req.method === 'POST') {
      const { t, text, still, mode } = await body(req);
      const d = read(id);
      const n = (d.comments.at(-1)?.n ?? 0) + 1;
      const c = { n, t: +(+t).toFixed(2), text, status: 'open', video: mode === 'live' ? 'live preview' : path.basename(video(id) ?? ''), at: new Date().toISOString() };
      if (still) { const f = `${id}-${n}.jpg`; fs.writeFileSync(p('review', f), Buffer.from(still.split(',')[1], 'base64')); c.still = `review/${f}`; }
      d.comments.push(c); write(id, d); json(res, c); return;
    }
    if (url.pathname === '/send' && req.method === 'POST') {
      const d = read(id);
      const open = d.comments.filter((c) => c.status === 'open');
      for (const c of open) c.status = 'sent';
      if (open.length) { (d.sends ??= []).push({ at: new Date().toISOString(), comments: open.map((c) => c.n) }); write(id, d); }
      console.log(`${id}: sent ${open.length} comment(s)`);
      json(res, { sent: open.length }); return;
    }
    if (url.pathname === '/approve' && req.method === 'POST') {
      const { approved } = await body(req);
      const d = read(id), v = video(id);
      const entry = { at: new Date().toISOString(), approved: !!approved, video: v ? path.basename(v) : null };
      if (approved && v) d.approved = { at: entry.at, video: entry.video, mtime: Math.round(fs.statSync(v).mtimeMs) };
      else delete d.approved;
      (d.approvals ??= []).push(entry);
      write(id, d);
      console.log(`${id}: ${approved ? 'approved' : 'approval withdrawn'}`);
      json(res, { approved: approvalOf(id) }); return;
    }
    if (url.pathname === '/reopen' && req.method === 'POST') {
      const { n } = await body(req);
      const d = read(id); const c = d.comments.find((x) => x.n === n);
      if (c) { c.status = 'open'; c.reopened = new Date().toISOString(); write(id, d); }
      json(res, { ok: !!c }); return;
    }
    if (url.pathname === '/comment' && req.method === 'DELETE') {
      const { n } = await body(req);
      const d = read(id); d.comments = d.comments.filter((c) => c.n !== n); write(id, d); json(res, { ok: true }); return;
    }
    none(res);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});

// An open page asks for /data every few seconds; nothing for this long means
// no page is open.
const idle = +(process.env.IDLE_MIN ?? 30) * 60_000;
setInterval(() => {
  if (Date.now() - last > idle) { console.log(`review: no page open for ${idle / 60_000} min, stopping`); process.exit(0); }
}, 30_000).unref();

server.listen(+(process.env.PORT ?? 0), '127.0.0.1', () => {
  const u = `http://127.0.0.1:${server.address().port}/${only ? `?v=${encodeURIComponent(only)}` : ''}`;
  console.log(`review: ${u}  (comments in review/<id>.json; stops after ${idle / 60_000} min with no page open)`);
  if (!process.env.NO_OPEN) execFile('open', [u]);
});
