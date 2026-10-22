// node review.mjs <project> <id>: opens the review page for a video, local
// only (127.0.0.1). The page plays build/<id>.draft.mp4 (or build/<id>.mp4)
// over a timeline of the script lines, the scenes, and the specials (zooms,
// gestures, drags, typing, clicks, pauses). A comment is pinned to a moment
// and saved, with a still of that frame, to review/<id>.json and
// review/<id>-<n>.jpg. Whoever makes the video reads the file, answers each
// comment there, and the page shows the answers. Ctrl+C stops it.
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
const timeline = () => pick(`${id}.draft.timeline.json`, `${id}.timeline.json`);
const store = p('review', `${id}.json`);
const read = () => (fs.existsSync(store) ? JSON.parse(fs.readFileSync(store, 'utf8')) : { id, comments: [] });
const write = (d) => fs.writeFileSync(store, JSON.stringify(d, null, 2) + '\n');

const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b ? JSON.parse(b) : {})); });
const json = (res, d) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(d)); };

// The video with Range support, so the player can seek.
function stream(req, res, file) {
  const size = fs.statSync(file).size;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (!m) { res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': size, 'accept-ranges': 'bytes' }); fs.createReadStream(file).pipe(res); return; }
  const start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : size - 1;
  res.writeHead(206, { 'content-type': 'video/mp4', 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': end - start + 1, 'accept-ranges': 'bytes' });
  fs.createReadStream(file, { start, end }).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(HERE, 'review.html'))); return; }
    if (url.pathname === '/video') { const f = video(); if (!f) { res.writeHead(404); res.end(); return; } stream(req, res, f); return; }
    if (url.pathname === '/data') {
      const f = timeline(), v = video();
      json(res, { id, video: v && path.basename(v), mtime: v && fs.statSync(v).mtimeMs, timeline: f ? JSON.parse(fs.readFileSync(f, 'utf8')) : null, review: read() });
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
    if (url.pathname === '/comment' && req.method === 'DELETE') {
      const { n } = await body(req);
      const d = read(); d.comments = d.comments.filter((c) => c.n !== n); write(d); json(res, { ok: true }); return;
    }
    res.writeHead(404); res.end();
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});

server.listen(0, '127.0.0.1', () => {
  const u = `http://127.0.0.1:${server.address().port}/`;
  console.log(`review ${id}: ${u}  (comments in review/${id}.json; Ctrl+C to stop)`);
  if (!process.env.NO_OPEN) execFile('open', [u]);
});
