// The recorder: headed Chrome windows signed in from copied cookies, eased
// pointer moves, and CDP screencast frames timed against the voice.
//
// The pointer is recorded as data (every move and press, timed), and the
// assembler draws it afterwards, large and sharp, under the camera's zoom.
// With pointer.mode "page" it is drawn in the page instead, and recorded with it.
import fs from 'node:fs';
import path from 'node:path';
import { playwright } from './project.mjs';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Reports every pointer move and press to the recorder.
const TRACK = `
(() => {
  const send = (type, e) => { try { window.__track(type, e.clientX, e.clientY); } catch {} };
  document.addEventListener('mousemove', (e) => send('move', e), true);
  document.addEventListener('mousedown', (e) => send('down', e), true);
  document.addEventListener('mouseup', (e) => send('up', e), true);
})();`;

// The pointer drawn in the page, for pointer.mode "page".
const PAGE_POINTER = `
(() => {
  const make = () => {
    if (document.getElementById('__cursor') || !document.documentElement) return;
    const c = document.createElement('div');
    c.id = '__cursor';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 28 28" style="transform-origin: 4px 2px; transition: transform 120ms"><path d="M5 3 L5 22 L10 17.5 L13.5 25 L17 23.5 L13.6 16 L20 16 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const x = window.__cx ?? -50, y = window.__cy ?? -50;
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none',
      transform: 'translate(' + (x - 4) + 'px,' + (y - 2) + 'px)', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.25))' });
    document.documentElement.appendChild(c);
  };
  const place = (x, y) => { window.__cx = x; window.__cy = y; make(); const c = document.getElementById('__cursor'); if (c) c.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 2) + 'px)'; };
  document.addEventListener('mousemove', (e) => place(e.clientX, e.clientY), true);
  // The press shrinks the arrow alone, from its tip. Scaling the positioned
  // layer would scale its translate too and throw the pointer up and left.
  const press = (on) => { const svg = document.querySelector('#__cursor svg'); if (svg) svg.style.transform = on ? 'scale(0.85)' : 'none'; };
  document.addEventListener('mousedown', () => press(true), true);
  document.addEventListener('mouseup', () => press(false), true);
  const keep = () => { make(); requestAnimationFrame(keep); };
  if (document.readyState !== 'loading') keep(); else document.addEventListener('DOMContentLoaded', keep);
})();`;

const OPEN = new Set();
let exitHooked = false;

// Writes a window's session back to its file, then closes it. Apps that rotate
// their refresh token (Supabase does) sign out a session whose old token comes
// back, so the cookie file must always hold the newest copy.
export async function closeWindow(w) {
  try {
    if (w.cookieFile) {
      const jar = (await w.context.cookies(w.base)).filter((c) => w.domain.endsWith(c.domain.replace(/^\./, '')));
      if (jar.length) fs.writeFileSync(w.cookieFile, jar.map((c) => `${c.name}=${c.value}`).join('; '));
    }
  } catch (e) { console.log('could not save session', w.name, e.message); }
  OPEN.delete(w);
  await w.context.close().catch(() => {});
}
export async function closeAll() { for (const w of [...OPEN]) await closeWindow(w); }

function hookExit() {
  if (exitHooked) return;
  exitHooked = true;
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, async () => { await closeAll(); process.exit(1); });
  for (const ev of ['uncaughtException', 'unhandledRejection']) process.on(ev, async (e) => { console.error(e); await closeAll(); process.exit(1); });
}

// Opens a headed window for an account (a key of config.accounts, or null for
// a window with no sign-in). `view` overrides the window's CSS size.
export async function openWindow(project, account, { url = null, x = 0, view } = {}) {
  hookExit();
  const { config } = project;
  const { chromium } = playwright(project);
  const v = view ?? config.view;
  const base = config.app.base;
  const acct = account ? config.accounts[account] : null;
  if (account && !acct) throw new Error(`no account "${account}" in video.config.json`);
  const scale = config.output.width / config.view.width;
  const context = await chromium.launchPersistentContext(project.p('raw', `profile-${account ?? 'anon'}`), {
    channel: 'chrome', headless: false, viewport: v, deviceScaleFactor: scale, locale: config.app.locale,
    // Off to the side of the screen, so a stray click can't land in it.
    args: [`--window-position=${config.app.windowX + x},40`, '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  });
  const w = new Window(account ?? 'anon', context, null, project);
  await context.exposeBinding('__track', (_src, type, px, py) => w.onTrack(type, px, py));
  await context.addInitScript(TRACK);
  if (config.pointer.mode === 'page') await context.addInitScript(PAGE_POINTER);
  if (acct?.cookies) {
    const domain = acct.domain ?? new URL(base).hostname;
    const raw = fs.readFileSync(acct.cookies, 'utf8').trim().replace(/^['"]|['"]$/g, '');
    await context.clearCookies();
    await context.addCookies(raw.split(/;\s*/).filter(Boolean).map((pair) => {
      const i = pair.indexOf('=');
      return { name: pair.slice(0, i), value: pair.slice(i + 1), domain, path: '/', secure: true, sameSite: 'Lax' };
    }));
    Object.assign(w, { cookieFile: acct.cookies, domain, base });
  }
  const page = context.pages()[0] ?? await context.newPage();
  for (const p of context.pages()) if (p !== page) await p.close();
  // A native dialog would freeze every pointer move: log it and dismiss it.
  page.on('dialog', (d) => { console.log(`[${w.name}] dialog: ${d.type()} ${d.message()}`); d.dismiss().catch(() => {}); });
  w.page = page;
  w.cx = v.width * 0.57; w.cy = v.height * 0.58;
  OPEN.add(w);
  if (url) await w.go(url);
  return w;
}

export class Window {
  constructor(name, context, page, project) {
    Object.assign(this, { name, context, page, project, t0: 0, moves: [], presses: [], zooms: [] });
  }
  get base() { return this._base ?? this.project.config.app.base; }
  set base(v) { this._base = v; }
  now() { return (Date.now() - this.t0) / 1000; }
  onTrack(type, x, y) {
    if (!this.t0) return;
    const t = this.now();
    if (type === 'move') this.moves.push([+t.toFixed(4), Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    else this.presses.push([+t.toFixed(4), type === 'down' ? 1 : 0]);
  }
  async go(url) {
    await this.page.goto(/^(https?|file):/.test(url) ? url : this.base + url, { waitUntil: 'load' });
    await this.page.waitForTimeout(1800);
    for (const name of this.project.config.app.dismiss) {
      const b = this.page.getByRole('button', { name, exact: true });
      if (await b.isVisible().catch(() => false)) await b.click();
    }
    await this.page.mouse.move(this.cx, this.cy);
  }
  async moveTo(x, y, ms = 550) {
    const sx = this.cx, sy = this.cy, n = Math.max(8, Math.round(ms / 16));
    for (let i = 1; i <= n; i++) {
      const k = ease(i / n);
      await this.page.mouse.move(sx + (x - sx) * k, sy + (y - sy) * k);
      await sleep(ms / n);
    }
    this.cx = x; this.cy = y;
  }
  async box(locator) {
    const l = typeof locator === 'string' ? this.page.locator(locator) : locator;
    await l.first().scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
    return l.first().boundingBox({ timeout: 4000 }).catch(() => null);
  }
  // Moves onto an element; `at` picks a point in its box (0..1), default centre.
  async hover(locator, ms = 550, at = [0.5, 0.5]) {
    const b = await this.box(locator);
    if (!b) { console.log(`[${this.name}] missing`, String(locator)); return false; }
    await this.moveTo(b.x + b.width * at[0], b.y + b.height * at[1], ms);
    return true;
  }
  async click(locator, ms = 550, at) {
    if (!(await this.hover(locator, ms, at))) return false;
    await sleep(90);
    await this.page.mouse.down(); await sleep(80); await this.page.mouse.up();
    await sleep(120);
    return true;
  }
  async type(text, delay = 85) { await this.page.keyboard.type(text, { delay }); }
  async key(k) { await this.page.keyboard.press(k); }
  async scroll(dy, ms = 700) {
    const n = Math.max(6, Math.round(ms / 30));
    for (let i = 0; i < n; i++) { await this.page.mouse.wheel(0, dy / n); await sleep(ms / n); }
  }
  // The camera: zooms onto an element or a point ([x, y] in CSS pixels) from
  // now; the assembler eases into it with the spring. zoom(null) zooms out.
  async zoom(target, scale = this.project.config.camera.zoom) {
    if (!this.t0) return;
    if (target == null) { this.zooms.push({ t: this.now(), scale: 1, x: 0, y: 0 }); return; }
    let x, y;
    if (Array.isArray(target)) [x, y] = target;
    else {
      const b = await this.box(target);
      if (!b) { console.log(`[${this.name}] zoom target missing`, String(target)); return; }
      x = b.x + b.width / 2; y = b.y + b.height / 2;
    }
    this.zooms.push({ t: this.now(), scale, x, y });
  }
  unzoom() { return this.zoom(null); }
  get role() { return this.page.getByRole.bind(this.page); }
  get text() { return this.page.getByText.bind(this.page); }
  heading(name, level = 2) { return this.page.getByRole('heading', { level, name }); }
  section(name) { return this.page.locator('section').filter({ has: this.page.getByRole('heading', { level: 2, name }) }); }
}

// Records every window from `start` to `end` (voice seconds), running beats
// [time, fn, opts] on time. Each beat starts `lead` seconds early, so the
// pointer lands on its word.
export async function record(project, { id, seg, windows, start, end, beats, lead = 0.45 }) {
  const shoots = [];
  for (const w of windows) {
    const dir = project.p('raw', `${id}-${seg}-${w.name}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const cdp = await w.context.newCDPSession(w.page);
    shoots.push({ w, dir, cdp, frames: [] });
  }
  let t0 = 0;
  for (const s of shoots) {
    s.cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
      const t = (Date.now() - t0) / 1000;
      const file = path.join(s.dir, `f${String(s.frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      s.frames.push([file, t]);
      s.cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
  }
  const { output, view } = project.config;
  t0 = Date.now();
  for (const s of shoots) Object.assign(s.w, { t0, moves: [[0, s.w.cx, s.w.cy]], presses: [], zooms: [] });
  await Promise.all(shoots.map((s) => s.cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: 90, everyNthFrame: 1,
    maxWidth: Math.round((s.w.page.viewportSize()?.width ?? view.width) * output.width / view.width), maxHeight: output.height,
  })));
  // Nudge each page so a first frame arrives at once.
  for (const s of shoots) await s.w.page.mouse.move(s.w.cx + 0.5, s.w.cy);

  const now = () => (Date.now() - t0) / 1000 + start;
  for (const [at, run, opts = {}] of beats.sort((a, b) => a[0] - b[0])) {
    if (at < start || at > end) continue;
    const go = at - (opts.lead ?? lead);
    const wait = (go - now()) * 1000;
    if (wait > 0) await sleep(wait);
    const late = now() - go;
    if (late > 0.6) console.log(`late ${late.toFixed(2)}s at ${at.toFixed(2)}`);
    const b0 = Date.now();
    try {
      await Promise.race([run(), sleep(opts.max ?? 15000).then(() => { throw new Error('timed out'); })]);
    } catch (e) { console.log('beat', at.toFixed(2), e.message.split('\n')[0]); }
    const took = (Date.now() - b0) / 1000;
    if (took > 1.5) console.log(`slow ${took.toFixed(2)}s at ${at.toFixed(2)}`);
  }
  const rest = (end - now()) * 1000;
  if (rest > 0) await sleep(rest);
  await Promise.all(shoots.map((s) => s.cdp.send('Page.stopScreencast').catch(() => {})));
  const total = (Date.now() - t0) / 1000;

  for (const s of shoots) {
    // An ffconcat list keeps each frame on screen until the next one arrived.
    const lines = ['ffconcat version 1.0'];
    s.frames.forEach(([file, t], i) => {
      const from = i === 0 ? 0 : t;
      const next = i + 1 < s.frames.length ? s.frames[i + 1][1] : total;
      lines.push(`file '${file}'`, `duration ${(next - from).toFixed(4)}`);
    });
    if (s.frames.length) lines.push(`file '${s.frames.at(-1)[0]}'`);
    fs.writeFileSync(path.join(s.dir, 'list.txt'), lines.join('\n'));
    const vp = s.w.page.viewportSize();
    fs.writeFileSync(path.join(s.dir, 'meta.json'), JSON.stringify({ id, seg, start, end, total, view: vp, frames: s.frames.map(([f, t]) => [path.basename(f), +t.toFixed(4)]) }));
    fs.writeFileSync(path.join(s.dir, 'pointer.json'), JSON.stringify({ view: vp, moves: s.w.moves, presses: s.w.presses, zooms: s.w.zooms }));
    s.w.t0 = 0;
    console.log(`${id}-${seg}-${s.w.name}: ${s.frames.length} frames, ${total.toFixed(2)}s (voice ${start.toFixed(2)}-${end.toFixed(2)})`);
  }
}
