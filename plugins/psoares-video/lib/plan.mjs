// node plan.mjs <project> <id>: the beats as a plan anyone can read before a
// take, written to build/<id>.plan.md and build/<id>.plan.json (for the
// review page). Each voice line with its time (gaps included) and what the
// screen does on it: the scenes, the account, the pauses, and every beat in
// plain words ("click 'Ferramentas'", "hover 'Roda da Vida'", "zoom").
// Nothing opens a browser.
import fs from 'node:fs';
import { loadProject, loadVideo } from './project.mjs';

const [dir, id] = process.argv.slice(2);
if (!dir || !id) { console.error('usage: node plan.mjs <project> <id>'); process.exit(2); }
const project = loadProject(dir);
const { mod, L, length, segments } = await loadVideo(project, id);

// A window that records nothing: the beats are built, never run.
const stub = () => new Proxy(function () {}, { get: (_, k) => (k === Symbol.toPrimitive ? () => '' : stub()), apply: () => stub() });

// The strings in a piece of source: quotes, template literals (with their
// ${name} kept as the name) and regexes.
const quoted = (src) => [...src.matchAll(/'([^']+)'|"([^"]+)"|`([^`]+)`|\/\^?([^/*\n]+?)\/[gimsuy]*[,)]/g)]
  .map((x) => (x[1] ?? x[2] ?? x[3] ?? x[4]).replace(/\$\{(\w+)\}/g, '$1').trim()).filter(Boolean);
const ROLES = new Set(['navigation', 'button', 'link', 'textbox', 'slider', 'switch', 'spinbutton', 'radio', 'tab', 'menuitem', 'heading', 'region', 'dialog', 'list', 'searchbox', 'Principal']);
const VERBS = {
  click: 'click', hover: 'hover', moveTo: 'move to a spot', drag: 'drag', dragBy: 'drag', type: 'type', key: 'press',
  zoom: 'zoom in on', unzoom: 'zoom out', circle: 'loop around', underline: 'underline', shake: 'shake', rest: 'rest',
  select: 'select the text of', marquee: 'selection box around', scroll: 'scroll', go: 'open',
};
// "w.click(card('Roda da Vida'), 800)" -> "click 'Roda da Vida'".
function describe(fn) {
  const src = fn.toString();
  const out = [];
  for (const m of src.matchAll(/\b(w\.)?(\w+)\(/g)) {
    // A helper of the beats file called with the window: "deleteTool(w, NEW)".
    const helper = !m[1] && src.startsWith('w,', m.index + m[0].length) || (!m[1] && src.startsWith('w)', m.index + m[0].length));
    if (!m[1] && !helper) continue;
    const verb = m[1] ? VERBS[m[2]] : m[2];
    if (!verb) continue;
    m[1] = m[2];
    let depth = 1, i = m.index + m[0].length;
    while (i < src.length && depth) { if (src[i] === '(') depth++; else if (src[i] === ')') depth--; i++; }
    const args = src.slice(m.index + m[0].length, i - 1);
    const names = helper ? args.split(',').slice(1).map((x) => x.trim().replace(/^['"`]|['"`]$/g, '')).filter(Boolean) : quoted(args).filter((x) => !ROLES.has(x) && !/^(ControlOrMeta|Space)$/.test(x));
    const what = m[1] === 'type' ? (names[0] ? `"${names[0]}"` : 'text') : m[1] === 'key' ? (names[0] ?? args.split(',')[0]) : names.length ? names.map((x) => `'${x}'`).join(' › ') : (args.match(/name:\s*(\w+)/)?.[1] ?? args.split(/[,(]/)[0].trim() ?? '');
    // A link goes somewhere: say so.
    const goes = m[1] === 'click' && /'link'|getByRole\('link'/.test(args) ? ', goes to that page' : '';
    out.push(`${verb}${what ? ' ' + what : ''}${goes}`);
  }
  if (src.includes("keyboard.down('Space')") && out.length) out[0] = `hold Space and ${out[0]}`;
  if (!out.length) {
    // A helper of the beats file: name it and what it is given.
    const call = src.match(/=>\s*(?:\{\s*)?(?:await\s+)?(\w+)\(/)?.[1];
    const names = quoted(src).filter((x) => !ROLES.has(x));
    return `${call ?? 'step'}${names.length ? ' ' + names.map((x) => `'${x}'`).join(', ') : ''}`;
  }
  return out.join(', ');
}

// The beats file's named strings (const NEW = 'Roda da Liderança'), so the
// plan shows the value, not the name.
const consts = Object.fromEntries([...fs.readFileSync(project.p('videos', `${id}.mjs`), 'utf8').matchAll(/const (\w+) = '([^']+)'/g)].map((m) => [m[1], m[2]]));
const named = (text) => text.replace(/\b([A-Z][A-Z0-9_]+)\b/g, (m) => consts[m] ?? m);
const tc = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const lines = L.lines ?? [];
const lineAt = (t) => lines.findLast((l) => l.start <= t + 0.05) ?? lines[0] ?? null;
const beats = [];
// Where a screen is, in words: "/pt/tools/d1…" -> "tools / d1…".
const where = (url) => (url ?? '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/[a-z]{2}(\/|$)/, '/').replace(/^\//, '') || 'home';
for (const [k, s] of segments.entries()) {
  const w = stub();
  const who = s.windows.map((x) => `${x.account ?? 'signed out'} on ${named(where(x.url.replace(/\$\{?(\w+)\}?/g, '$1')))}`).join(' + ');
  const before = s.setup ? describe(s.setup) : '';
  beats.push({ t: k === 0 ? 0 : s.start, scene: s.name, what: named(`starts: ${who}${before && before !== 'step' ? ` (before it, off camera: ${before})` : ''}`), shift: lineAt(s.start)?.shift ?? 0, start: true });
  for (const [t, fn, opts] of s.beats(w)) beats.push({ t, scene: s.name, what: named(describe(fn)), lead: opts?.lead, shift: lineAt(t)?.shift ?? 0 });
}
beats.sort((a, b) => a.t - b.t);

const md = [`# ${id}: plan`, '', `Length ${tc(length)}. Scenes: ${segments.map((s) => `${s.name} (${s.windows.map((x) => x.account ?? 'signed out').join(' + ')}, from ${tc(s.start)})`).join('; ')}.`, ''];
const gaps = Object.entries(mod.gaps ?? {});
md.push(gaps.length ? `Pauses added to the voice: ${gaps.map(([i, g]) => `${g} s before line ${i}`).join(', ')}.` : 'No pauses added to the voice.', '');
md.push('| Time | Line | On screen |', '|---|---|---|');
const json = { id, length, segments: segments.map((s) => ({ name: s.name, start: s.start, accounts: s.windows.map((x) => x.account) })), beats: [] };
let scene = null;
for (const l of lines.length ? lines : [{ i: '', start: 0, text: '' }]) {
  const mine = beats.filter((b) => lineAt(b.t) === l || (!lines.length));
  const seg = segments.findLast((s) => s.start <= l.start + 0.05);
  if (seg && seg.name !== scene) { scene = seg.name; md.push(`| | **${seg.name}** | ${seg.windows.map((x) => x.account ?? 'signed out').join(' + ')}, opens on ${seg.windows.map((x) => x.url).join(' + ')} |`); }
  const screen = mine.length ? mine.map((b) => `${tc(b.t)} ${b.what}`).join('<br>') : '(still)';
  md.push(`| ${tc(l.start)} | ${l.i}. ${String(l.text).replace(/\|/g, '/')} | ${screen} |`);
}
// `shift` is the pause added before that point: the review page subtracts
// it when it plays the plain voice, before any recording exists.
for (const b of beats) json.beats.push({ t: +b.t.toFixed(2), shift: b.shift, scene: b.scene, what: b.what });
json.lines = lines.map((l) => ({ i: l.i, text: l.text, start: l.start, end: l.end, shift: l.shift }));
fs.writeFileSync(project.p('build', `${id}.plan.md`), md.join('\n') + '\n');
fs.writeFileSync(project.p('build', `${id}.plan.json`), JSON.stringify(json));
console.log(`wrote build/${id}.plan.md (${beats.length} beats over ${lines.length} lines)`);
