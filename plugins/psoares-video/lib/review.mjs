// node review.mjs <project> <id> [--wait]: opens the review page for a video, local
// only (127.0.0.1). The page plays build/<id>.draft.mp4 (or build/<id>.mp4)
// over a timeline of the script lines, the scenes, and the specials (zooms,
// gestures, drags, typing, clicks, pauses). A comment is pinned to a moment
// and saved, with a still of that frame, to review/<id>.json and
// review/<id>-<n>.jpg. "Send to Claude" marks the new comments `sent`.
// Whoever makes the video reads the file, answers each comment there
// (`done` or `answered`, with a `reply`), and the page shows the answers.
// Ctrl+C stops it.
//
// --wait starts no page: it waits for the next send, prints the comments
// sent, and exits. Run it in the background beside the page, so the send
// wakes whoever is waiting.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadProject } from './project.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [dir, id] = process.argv.slice(2);
if (!dir || !id) { console.error('usage: node review.mjs <project> <id>'); process.exit(2); }
const { p } = loadProject(dir);
fs.mkdirSync(p('review'), { recursive: true });

const pick = (...names) => names.map((n) => p('build', n)).find((f) => fs.existsSync(f));
const video = () => pick(`${id}.draft.mp4`, `${id}.mp4`);
// Before any recording: the plain voice, so the plan can be heard.
const voice = () => [p('audio', `${id}.mp3`)].find((f) => fs.existsSync(f));
const plan = () => pick(`${id}.plan.json`);
const timeline = () => pick(`${id}.draft.timeline.json`, `${id}.timeline.json`);
const store = p('review', `${id}.json`);
const read = () => (fs.existsSync(store) ? JSON.parse(fs.readFileSync(store, 'utf8')) : { id, comments: [] });
const write = (d) => fs.writeFileSync(store, JSON.stringify(d, null, 2) + '\n');

if (process.argv[4] === '--wait') {
  const seen = (read().sends ?? []).length;
  for (;;) {
    const d = read(), sends = d.sends ?? [];
    if (sends.length > seen) {
      const send = sends.at(-1);
      console.log(`review ${id}: ${send.comments.length} comment(s) sent at ${send.at}`);
      for (const n of send.comments) {
        const c = d.comments.find((x) => x.n === n);
        if (c) console.log(`#${c.n} ${Math.floor(c.t / 60)}:${(c.t % 60).toFixed(1).padStart(4, '0')} ${c.text.replace(/\n/g, ' / ')}${c.still ? `  [${c.still}]` : ''}`);
      }
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b ? JSON.parse(b) : {})); });
const json = (res, d) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };

// The video with Range support, so the player can seek.
function stream(req, res, file) {
  const size = fs.statSync(file).size, type = file.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4';
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (!m) { res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' }); fs.createReadStream(file).pipe(res); return; }
  const start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1, 'accept-ranges': 'bytes' });
  fs.createReadStream(file, { start, end }).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(HERE, 'review.html'))); return; }
    if (url.pathname === '/video') { const f = video() ?? voice(); if (!f) { res.writeHead(404); res.end(); return; } stream(req, res, f); return; }
    if (url.pathname === '/data') {
      const f = timeline(), v = video() ?? voice(), pl = plan();
      json(res, { id, video: v && path.basename(v), voiceOnly: !video(), mtime: v && fs.statSync(v).mtimeMs, timeline: video() && f ? JSON.parse(fs.readFileSync(f, 'utf8')) : null, plan: pl ? JSON.parse(fs.readFileSync(pl, 'utf8')) : null, review: read() });
      return;
    }
    if (url.pathname.startsWith('/still/')) {
      const f = p('review', path.basename(url.pathname));
      if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': 'image/jpeg' }); fs.createReadStream(f).pipe(res); return;
    }
    if (url.pathname === '/comment' && req.method === 'POST') {
      const { t, text, still } = await body(req);
      const d = read();
      const n = (d.comments.at(-1)?.n ?? 0) + 1;
      const c = { n, t: +(+t).toFixed(2), text, status: 'open', video: path.basename(video() ?? ''), at: new Date().toISOString() };
      if (still) { const f = `${id}-${n}.jpg`; fs.writeFileSync(p('review', f), Buffer.from(still.split(',')[1], 'base64')); c.still = `review/${f}`; }
      d.comments.push(c); write(d); json(res, c); return;
    }
    if (url.pathname === '/send' && req.method === 'POST') {
      const d = read();
      const open = d.comments.filter((c) => c.status === 'open');
      for (const c of open) c.status = 'sent';
      if (open.length) { (d.sends ??= []).push({ at: new Date().toISOString(), comments: open.map((c) => c.n) }); write(d); }
      console.log(`sent ${open.length} comment(s)`);
      json(res, { sent: open.length }); return;
    }
    if (url.pathname === '/comment' && req.method === 'DELETE') {
      const { n } = await body(req);
      const d = read(); d.comments = d.comments.filter((c) => c.n !== n); write(d); json(res, { ok: true }); return;
    }
    res.writeHead(404); res.end();
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});

server.listen(+(process.env.PORT ?? 0), '127.0.0.1', () => {
  const u = `http://127.0.0.1:${server.address().port}/`;
  console.log(`review ${id}: ${u}  (comments in review/${id}.json; Ctrl+C to stop)`);
  if (!process.env.NO_OPEN) execFile('open', [u]);
});
