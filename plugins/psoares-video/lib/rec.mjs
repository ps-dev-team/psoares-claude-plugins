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
// A hand's move: quick to start, long to settle (minimum jerk, front-loaded).
const ease = (t) => { const u = Math.pow(t, 0.75); return u * u * u * (10 - 15 * u + 6 * u * u); };
const smooth = (t) => t * t * (3 - 2 * t);
// Smooth random wobble on 0..1, about -1..1: a few slow sines with random
// pitch and phase, new for every move.
const wobble = (rand, waves = 3) => {
  const w = Array.from({ length: waves }, () => [1 + rand() * 4, rand() * 6.3, 0.4 + rand() * 0.6]);
  const total = w.reduce((a, [, , m]) => a + m, 0);
  return (u) => w.reduce((a, [f, ph, m]) => a + m * Math.sin(f * 2 * Math.PI * u + ph), 0) / total;
};
// A seeded random source, so a re-take of the same video makes the same
// gestures and a good take can be made again.
const seeded = (text) => {
  let a = 0;
  for (const ch of String(text)) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Reports every pointer move and press to the recorder.
const TRACK = `
(() => {
  // Only the real pointer, in the page itself: apps and iframes fire their own
  // mouse events (untrusted, or in a frame's own coordinates), and one of those
  // in the path sends the drawn pointer off and back.
  if (window !== window.top) return;
  // The cursor the page shows under the pointer, as Screen Studio records the
  // system's: a hand over what can be clicked, an I-beam over text.
  const shape = (e) => {
    const c = e.target instanceof Element ? getComputedStyle(e.target).cursor : 'auto';
    const named = { pointer: 'hand', text: 'ibeam', grab: 'openhand', grabbing: 'closedhand', 'not-allowed': 'notallowed',
      'col-resize': 'resizeleftright', 'ew-resize': 'resizeleftright', 'e-resize': 'resizeleftright', 'w-resize': 'resizeleftright',
      'row-resize': 'resizeupdown', 'ns-resize': 'resizeupdown', 'n-resize': 'resizeupdown', 's-resize': 'resizeupdown', move: 'move' };
    if (named[c]) return named[c];
    if (c === 'auto' && e.target instanceof Element && e.target.closest('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,[contenteditable=true]')) return 'ibeam';
    return 'arrow';
  };
  // The path and the presses come from the recorder itself (it knows where it
  // moved); the page only says which cursor it shows. Pointer events, because
  // a drag handle that captures the pointer silences the mouse ones.
  const send = (e) => { if (!e.isTrusted) return; try { window.__track('shape', e.clientX, e.clientY, shape(e)); } catch {} };
  document.addEventListener('pointermove', send, true);
  document.addEventListener('pointerdown', send, true);
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
  // config.profiles keeps each account's Chrome profile (and its session) outside
  // the project, e.g. in ~/.config, so a restart doesn't sign anyone out.
  const profiles = config.profiles ? config.profiles.replace(/^~/, process.env.HOME) : project.p('raw');
  const context = await chromium.launchPersistentContext(path.join(profiles, `profile-${account ?? 'anon'}`), {
    channel: 'chrome', headless: false, viewport: v, deviceScaleFactor: scale, locale: config.app.locale,
    ...(config.app.timezone ? { timezoneId: config.app.timezone } : {}),
    // Off to the side of the screen, so a stray click can't land in it.
    args: [`--window-position=${config.app.windowX + x},40`, '--mute-audio', '--autoplay-policy=no-user-gesture-required'],
  });
  const w = new Window(account ?? 'anon', context, null, project);
  w.base = base;
  await context.exposeBinding('__track', (_src, type, px, py, kind) => w.onTrack(type, px, py, kind));
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
    Object.assign(this, { name, context, page, project, t0: 0, moves: [], presses: [], zooms: [], marks: [], notes: [], events: [], movedAt: 0 });
    this.rand = seeded(name);
  }
  // config.pointer.human (default on) lets the hand do small things of its
  // own: a hook at the end of some moves, a drift while it rests.
  get human() { return this.project.config.pointer.human !== false; }
  get base() { return this._base ?? this.project.config.app.base; }
  set base(v) { this._base = v; }
  now() { return (Date.now() - this.t0) / 1000; }
  // Something worth a look, logged and kept for the video's report.
  note(msg) {
    console.log(`[${this.name}] ${msg}`);
    if (this.t0) this.notes.push([+this.now().toFixed(2), msg]);
  }
  // The specials (gestures, drags, selections, typing), for the review timeline.
  event(kind) {
    if (this.t0) this.events.push([+this.now().toFixed(2), kind]);
  }
  onTrack(type, x, y, kind) {
    if (type === 'shape' && kind) this.shape = kind;
  }
  // Every move and press is logged here, from the recorder's own actions.
  logMove(x, y) {
    if (this.t0) this.moves.push([+this.now().toFixed(4), Math.round(x * 10) / 10, Math.round(y * 10) / 10, this.shape ?? 'arrow']);
    this.movedAt = Date.now();
  }
  // Moves the pointer along a path p(u), u from 0 to 1, over ms.
  // It follows the clock, so a slow step doesn't stretch the gesture.
  async trace(p, ms) {
    const t0 = Date.now();
    for (;;) {
      const u = Math.min(1, (Date.now() - t0) / ms);
      const [x, y] = p(u);
      await this.page.mouse.move(x, y);
      this.logMove(x, y);
      this.cx = x; this.cy = y;
      if (u >= 1) break;
      await sleep(12);
    }
  }
  async press(down) {
    if (down) await this.page.mouse.down(); else await this.page.mouse.up();
    if (this.t0) this.presses.push([+this.now().toFixed(4), down ? 1 : 0]);
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
  // The time follows the distance (a short hop is quick, a long one takes a
  // little longer), `ms` is the most it may take, and the path bows slightly,
  // as a wrist does, instead of running on a ruler.
  //
  // A long move sometimes ends in a hook, as a hand does: it runs a little
  // past and curls back onto the target. `hook` true or false forces it.
  //
  // `exact` makes ms the move's length: a drag carries something, and a page
  // can't follow a hand that flies.
  async moveTo(x, y, ms = 550, { hook, exact = false } = {}) {
    const sx = this.cx, sy = this.cy, dx = x - sx, dy = y - sy;
    const dist = Math.hypot(dx, dy);
    if (hook ?? (this.human && dist > 220 && this.rand() < 0.3)) {
      const over = Math.min(26, 8 + dist * 0.03), side = (this.rand() < 0.5 ? -1 : 1) * over * 0.6;
      const ux = dist ? dx / dist : 0, uy = dist ? dy / dist : 0;
      await this.moveTo(x + ux * over - uy * side, y + uy * over + ux * side, ms, { hook: false });
      await sleep(40);
      return this.moveTo(x, y, 260, { hook: false });
    }
    // No two moves alike: each draws its own length, arc, ease and wobble.
    // The hand speeds up and settles at the ends, and in between its speed
    // wavers and the line drifts a little off true, as a wrist's does.
    const r = this.human ? this.rand : () => 0.5;
    const dur = exact ? ms : Math.min(ms, 140 + 0.2 * dist) * (0.85 + 0.3 * r());
    const n = Math.max(6, Math.round(dur / 16));
    const bow = Math.min(60, dist * (0.03 + 0.09 * r())) * (r() < 0.75 === (dx * dy >= 0) ? 1 : -1);
    const nx = dist ? -dy / dist : 0, ny = dist ? dx / dist : 0;
    const pace = this.human ? wobble(this.rand) : () => 0, drift = this.human ? wobble(this.rand) : () => 0;
    const wav = 0.25 + 0.2 * r(), side = Math.min(7, dist * 0.015);
    // Progress with a wavering speed, normalised so it still ends on the target.
    const steps = [0];
    for (let i = 1; i <= n; i++) steps.push(steps[i - 1] + 1 + wav * pace(i / n));
    const shape = 0.65 + 0.25 * r();
    const easeOf = (t) => { const u = Math.pow(t, shape); return u * u * u * (10 - 15 * u + 6 * u * u); };
    const at = (u) => { const f = u * n, i = Math.floor(f), j = Math.min(n, i + 1); return (steps[i] + (steps[j] - steps[i]) * (f - i)) / steps[n]; };
    await this.trace((u) => {
      const k = easeOf(at(u)), env = 4 * k * (1 - k);
      const off = env * bow + env * side * drift(k);
      return [sx + dx * k + nx * off, sy + dy * k + ny * off];
    }, dur);
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
    if (!b) { this.note(`missing ${String(locator)}`); return false; }
    await this.moveTo(b.x + b.width * at[0], b.y + b.height * at[1], ms);
    return true;
  }
  async click(locator, ms = 550, at) {
    if (!(await this.hover(locator, ms, at))) return false;
    // The drawn pointer trails on its spring: let it land before the press.
    await sleep(200);
    await this.press(true); await sleep(80); await this.press(false);
    await sleep(120);
    return true;
  }
  // Press on a handle, carry it to a point (or by [dx, dy]), and let go. The
  // drawn pointer is a closed hand while the button is held.
  async drag(locator, to, ms = 1100, at) {
    if (!(await this.hover(locator, 450, at))) return false;
    this.event('drag');
    await sleep(200);
    await this.press(true);
    await sleep(150);
    await this.moveTo(to[0], to[1], ms, { hook: false, exact: true });
    await sleep(150);
    await this.press(false);
    await sleep(150);
    return true;
  }
  async dragBy(locator, dx, dy, ms = 1100, at) {
    const b = await this.box(locator);
    if (!b) { this.note(`missing ${String(locator)}`); return false; }
    const ax = at?.[0] ?? 0.5, ay = at?.[1] ?? 0.5;
    return this.drag(locator, [b.x + b.width * ax + dx, b.y + b.height * ay + dy], ms, at);
  }
  // Gestures: what a hand does to point at something while the voice talks
  // about it. Each is drawn by the real pointer, so the page sees it too.

  // A loop around an element, as if circling it on paper: a little uneven,
  // closing slightly inside where it began.
  async circle(locator, { turns = 0.95 + this.rand() * 0.45, ms = 560 + this.rand() * 220, pad = 12 + this.rand() * 10 } = {}) {
    const b = await this.box(locator);
    if (!b) { this.note(`missing ${String(locator)}`); return false; }
    this.event('loop');
    const ox = b.x + b.width / 2, oy = b.y + b.height / 2;
    const rx = Math.max(30, b.width / 2 + pad), ry = Math.max(24, b.height / 2 + pad);
    const a0 = Math.atan2((this.cy - oy) / ry, (this.cx - ox) / rx);
    const dir = this.rand() < 0.5 ? -1 : 1, uneven = wobble(this.rand), close = 0.04 + this.rand() * 0.12;
    const at = (u) => {
      const a = a0 + dir * u * turns * 2 * Math.PI;
      const r = (1 + 0.07 * uneven(u)) * (1 - close * u);
      return [ox + rx * r * Math.cos(a), oy + ry * r * Math.sin(a)];
    };
    const [sx, sy] = at(0);
    await this.moveTo(sx, sy, 450, { hook: false });
    await this.trace((u) => at(smooth(u)), ms * turns);
    return true;
  }
  // Back and forth under an element, like underlining it while reading.
  async underline(locator, { strokes = 2 + Math.floor(this.rand() * 3), ms = 320 + this.rand() * 140, gap = 6 + this.rand() * 6 } = {}) {
    const b = await this.box(locator);
    if (!b) { this.note(`missing ${String(locator)}`); return false; }
    this.event('underline');
    const y = b.y + b.height + gap, x0 = b.x + b.width * 0.04, x1 = b.x + b.width * 0.96;
    await this.moveTo(x0, y, 450, { hook: false });
    for (let i = 0; i < strokes; i++) {
      const from = i % 2 ? x1 : x0, to = i % 2 ? x0 : x1, lift = (this.rand() - 0.5) * 6;
      const shrink = 1 - 0.12 * i;
      await this.trace((u) => { const k = smooth(u); return [from + (to - from) * k * shrink, y + lift * Math.sin(Math.PI * k)]; }, ms);
    }
    return true;
  }
  // A quick shake, side to side: the drawn cursor grows while it lasts, as
  // macOS does when you shake the mouse to find it.
  async shake({ ms = 700, width = 90 } = {}) {
    this.event('shake');
    const sx = this.cx, sy = this.cy, turns = 3.5;
    await this.trace((u) => [sx + width * Math.sin(u * turns * 2 * Math.PI) * Math.sin(Math.PI * u), sy + 6 * Math.sin(u * 9)], ms);
  }
  // A hand at rest is never quite still. Each rest is made new: a few slow
  // circles of random size, pitch and direction added together, faded in and
  // out so it leaves and comes back to the same point. One comes out a small
  // loop, the next a drift, a sway, a figure eight, a spiral. record() calls
  // it in the longer pauses between beats; a beat can call it too.
  async rest(ms = 1200, size = 7 + this.rand() * 9) {
    const sx = this.cx, sy = this.cy;
    const parts = Array.from({ length: 1 + Math.floor(this.rand() * 3) }, () => ({
      fx: (0.4 + this.rand() * 2) * (this.rand() < 0.5 ? -1 : 1), fy: 0.4 + this.rand() * 2,
      px: this.rand() * 6.3, py: this.rand() * 6.3, ax: 0.4 + this.rand(), ay: 0.3 + this.rand() * 0.9,
    }));
    const sum = parts.reduce((a, p) => a + Math.max(p.ax, p.ay), 0);
    const pace = wobble(this.rand);
    await this.trace((u) => {
      const k = Math.min(1, Math.max(0, u + 0.06 * pace(u) * Math.sin(Math.PI * u))), env = Math.sin(Math.PI * k);
      let ox = 0, oy = 0;
      for (const p of parts) {
        ox += p.ax * (Math.sin(p.fx * 2 * Math.PI * k + p.px) - Math.sin(p.px));
        oy += p.ay * (Math.sin(p.fy * 2 * Math.PI * k + p.py) - Math.sin(p.py));
      }
      return [sx + (size * env * ox) / sum, sy + (size * env * oy) / sum];
    }, ms);
    await this.page.mouse.move(sx, sy); this.logMove(sx, sy); this.cx = sx; this.cy = sy;
  }
  // Marks an area, as a person drags a selection box on a desktop: the cursor
  // goes to one corner, presses, pulls the box to the other corner and lets
  // go. The box is drawn by the assembler (dashed, rounded, with a shadow)
  // and stays `hold` ms, then fades. Nothing is pressed in the page, so the
  // app under it never reacts. Target: an element, or [x, y, width, height].
  async marquee(target, { hold = 1800, pad = 10, ms = 650 } = {}) {
    let b = Array.isArray(target) ? { x: target[0], y: target[1], width: target[2], height: target[3] } : await this.box(target);
    if (!b) { this.note(`missing ${String(target)}`); return false; }
    this.event('box');
    const x0 = b.x - pad, y0 = b.y - pad, x1 = b.x + b.width + pad, y1 = b.y + b.height + pad;
    await this.moveTo(x0, y0, 550);
    await sleep(180);
    const mark = { t0: this.now(), x: x0, y: y0 };
    await this.moveTo(x1, y1, ms, { hook: false, exact: true });
    Object.assign(mark, { t1: this.now(), t2: this.now() + hold / 1000 });
    if (this.t0) this.marks.push(mark);
    await sleep(160);
    return true;
  }
  // Selects an element's text the way a person does: press at the start of
  // the first line, drag to the end of the last, let go. The cursor is the
  // I-beam throughout, and the selection is the page's own.
  // `word` selects only that word (or phrase) inside it.
  async select(locator, ms = 700, word = null) {
    this.event('select');
    const l = typeof locator === 'string' ? this.page.locator(locator) : locator;
    await this.box(l);
    const ends = await l.first().evaluate((el, word) => {
      const r = document.createRange(); r.selectNodeContents(el);
      if (word) {
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          const i = n.textContent.indexOf(word);
          if (i >= 0) { r.setStart(n, i); r.setEnd(n, i + word.length); break; }
        }
      }
      const rects = [...r.getClientRects()].filter((q) => q.width > 0);
      if (!rects.length) return null;
      const a = rects[0], b = rects.at(-1);
      return [a.left + 1, a.top + a.height / 2, b.right - 1, b.top + b.height / 2];
    }, word).catch(() => null);
    if (!ends) { this.note(`no text to select in ${String(locator)}`); return false; }
    await this.moveTo(ends[0], ends[1], 550);
    await sleep(200);
    await this.press(true);
    await sleep(100);
    await this.moveTo(ends[2], ends[3], ms, { hook: false, exact: true });
    await sleep(100);
    await this.press(false);
    await sleep(150);
    return true;
  }
  async type(text, delay = 85) { this.event('type'); await this.page.keyboard.type(text, { delay }); }
  async key(k) { await this.page.keyboard.press(k); }
  async scroll(dy, ms = 700) {
    const n = Math.max(6, Math.round(ms / 30));
    for (let i = 0; i < n; i++) { await this.page.mouse.wheel(0, dy / n); await sleep(ms / n); }
  }
  // The camera: zooms onto an element or a point ([x, y] in CSS pixels) from
  // now; the assembler eases into it with the spring. zoom(null) zooms out.
  async zoom(target, scale = this.project.config.camera.zoom) {
    if (!this.t0) return;
    const last = this.zooms.at(-1);
    if (target == null) { this.zooms.push({ t: this.now(), scale: 1, x: 0, y: 0 }); return; }
    // A zoom is for one place the voice stays on. Moving it, or zooming in
    // again right after zooming out, reads as a restless camera.
    if (last && last.scale > 1) this.note('zoom moved to another place without zooming out first');
    else if (last && this.now() - last.t < 3) this.note(`zoom in ${(this.now() - last.t).toFixed(1)}s after a zoom out: reads as a camera move`);
    let x, y;
    if (Array.isArray(target)) [x, y] = target;
    else {
      const b = await this.box(target);
      if (!b) { this.note(`zoom target missing: ${String(target)}`); return; }
      x = b.x + b.width / 2; y = b.y + b.height / 2;
      // A zoom is for reading something small and dense. A big target (a
      // form, an editor, a panel) reads fine in the full frame.
      const v = this.page.viewportSize();
      if (b.width > v.width * 0.4 || b.height > v.height * 0.5) this.note(`zoom on a large area (${Math.round(b.width)}x${Math.round(b.height)}): a zoom is only for something small and dense`);
    }
    if (this.zooms.filter((z) => z.scale > 1).length >= 1) this.note('a second zoom in this take: most lessons need one zoom or none');
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
  for (const s of shoots) Object.assign(s.w, { t0, moves: [[0, s.w.cx, s.w.cy, 'arrow']], presses: [], zooms: [], marks: [], notes: [], events: [], rand: seeded(`${id}-${seg}-${s.w.name}`) });
  await Promise.all(shoots.map((s) => s.cdp.send('Page.startScreencast', {
    format: 'jpeg', quality: 90, everyNthFrame: 1,
    maxWidth: Math.round((s.w.page.viewportSize()?.width ?? view.width) * output.width / view.width), maxHeight: output.height,
  })));
  // Nudge each page so a first frame arrives at once.
  for (const s of shoots) await s.w.page.mouse.move(s.w.cx + 0.5, s.w.cy);

  const now = () => (Date.now() - t0) / 1000 + start;
  const notes = []; // [voice time, what happened], for the report
  const order = beats.sort((a, b) => a[0] - b[0]);
  for (const [bi, [at, run, opts = {}]] of order.entries()) {
    if (at < start || at > end) continue;
    const go = at - (opts.lead ?? lead);
    let wait = (go - now()) * 1000;
    // A long pause: now and then, the hand that moved last drifts a little
    // instead of standing dead still.
    const still = shoots.map((s) => s.w).sort((a, b) => b.movedAt - a.movedAt)[0];
    if (wait > 1800 && still.human && still.rand() < 0.4) {
      const idle = 300 + still.rand() * 500;
      await sleep(idle);
      await still.rest(Math.min(wait - idle - 300, 1100 + still.rand() * 500));
      wait = (go - now()) * 1000;
    }
    if (wait > 0) await sleep(wait);
    const late = now() - go;
    const flag = (msg) => { console.log(msg); notes.push([+at.toFixed(2), msg]); };
    if (late > 0.6) flag(`late ${late.toFixed(2)}s at ${at.toFixed(2)}`);
    const b0 = Date.now();
    try {
      await Promise.race([run(), sleep(opts.max ?? 15000).then(() => { throw new Error('timed out'); })]);
    } catch (e) { flag(`beat ${at.toFixed(2)} failed: ${e.message.split('\n')[0]}`); }
    const took = (Date.now() - b0) / 1000;
    // Slow only if it ran into the next beat's time; a long gesture is fine.
    const next = order[bi + 1];
    const over = next ? now() - (next[0] - (next[2]?.lead ?? lead)) : 0;
    if (over > 0.3) flag(`slow ${took.toFixed(2)}s at ${at.toFixed(2)}, ran ${over.toFixed(2)}s into the next beat`);
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
    fs.writeFileSync(path.join(s.dir, 'meta.json'), JSON.stringify({ id, seg, start, end, total, view: vp, notes: [...notes, ...s.w.notes.map(([t, m]) => [+(t + start).toFixed(2), `${s.w.name}: ${m}`])], frames: s.frames.map(([f, t]) => [path.basename(f), +t.toFixed(4)]) }));
    fs.writeFileSync(path.join(s.dir, 'pointer.json'), JSON.stringify({ view: vp, moves: s.w.moves, presses: s.w.presses, zooms: s.w.zooms, marks: s.w.marks, events: s.w.events }));
    s.w.t0 = 0;
    console.log(`${id}-${seg}-${s.w.name}: ${s.frames.length} frames, ${total.toFixed(2)}s (voice ${start.toFixed(2)}-${end.toFixed(2)})`);
  }
}
