#!/usr/bin/env node
/**
 * Opens the project's URL in a window of the user's own Chrome, with the
 * picker (picker.js) injected into every page, and writes each round the
 * user sends to `<cwd>/.annotations/<stamp>/` as notes.json plus one PNG
 * per note. The picker talks to this process through two exposed
 * functions; there is no server and nothing to install in the browser.
 *
 *   node annotate.mjs <url> [--out <dir>] [--profile <dir>]
 *
 * Runs until the window is closed. Screenshots are the browser's own
 * pixels (page.screenshot with a clip), so canvases, iframes, fonts and
 * floating menus all come out as they are on screen.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);

/** Keep the round outside git without touching a repo that already does. */
function ignore(project) {
  const gi = join(project, '.gitignore');
  if (!existsSync(join(project, '.git'))) return;
  const line = '.annotations/';
  const has =
    existsSync(gi) &&
    readFileSync(gi, 'utf8')
      .split('\n')
      .some((l) => l.trim() === line);
  if (!has)
    appendFileSync(
      gi,
      `${existsSync(gi) ? '\n' : ''}# Annotations for the agent (psoares-annotate); read and deleted\n${line}\n`,
    );
}

/**
 * Open the window and wire the picker. Returns the browser context; the
 * caller decides what to do when it closes.
 */
export async function start({ url, project = process.cwd(), out, profile, headless = false }) {
  out = resolve(out ?? join(project, '.annotations'));
  profile = resolve(profile ?? join(homedir(), '.claude', 'psoares-annotate', 'profile'));

  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    throw new Error(
      `playwright-core is not installed for the plugin. Run:\n  npm install --prefix ${resolve(here, '..')}`,
    );
  }
  const picker = readFileSync(join(here, 'picker.js'), 'utf8');

  const context = await chromium.launchPersistentContext(profile, {
    channel: headless ? undefined : 'chrome',
    headless,
    viewport: headless ? { width: 1400, height: 900 } : null,
    deviceScaleFactor: headless ? 2 : undefined,
    args: ['--window-size=1440,960', '--disable-infobars'],
    ignoreDefaultArgs: ['--enable-automation'],
  });

  /* Notes live here, not in the page: the user may move between pages of the
     app before sending, and a navigation would lose in-page state. */
  let pending = [];
  /* Same for the mode: annotate or navigate, kept across page loads. */
  let mode = 'navigate';
  /* A note to scroll to once the page it was made on has loaded. */
  let focus = null;

  await context.exposeFunction('__annotateShot', async (clip) => {
    const page = context.pages().find((p) => !p.isClosed());
    if (!page) return null;
    const buf = await page.screenshot({
      type: 'png',
      clip: {
        x: clip.x,
        y: clip.y,
        width: Math.max(1, clip.width),
        height: Math.max(1, clip.height),
      },
    });
    return `data:image/png;base64,${buf.toString('base64')}`;
  });

  await context.exposeFunction('__annotateAdd', (note) => {
    pending.push(note);
    return pending.length;
  });
  await context.exposeFunction('__annotateRemove', (id) => {
    pending = pending.filter((n) => n.id !== id);
    return pending.length;
  });
  /* The list the picker shows: no images, they are large and it has no use
     for them. `focus` is handed over once. */
  await context.exposeFunction('__annotateState', () => {
    const f = focus;
    focus = null;
    return {
      project,
      mode,
      focus: f,
      count: pending.length,
      notes: pending.map(({ id, note, url, route, path }) => ({ id, note, url, route, path })),
    };
  });
  await context.exposeFunction('__annotateEdit', (id, text) => {
    const n = pending.find((x) => x.id === id);
    if (n && typeof text === 'string' && text.trim()) n.note = text;
    return Boolean(n);
  });
  await context.exposeFunction('__annotateOrder', (ids) => {
    const at = new Map(ids.map((id, i) => [id, i]));
    pending.sort((a, b) => (at.get(a.id) ?? Infinity) - (at.get(b.id) ?? Infinity));
    return pending.length;
  });
  await context.exposeFunction('__annotateFocus', (id) => {
    focus = id;
  });
  await context.exposeFunction('__annotateMode', (next) => {
    if (next === 'annotate' || next === 'navigate') mode = next;
    return mode;
  });
  await context.exposeFunction('__annotateSend', () => {
    if (!pending.length) return null;
    const dir = join(out, stamp());
    mkdirSync(dir, { recursive: true });
    const written = pending.map(({ image, id, ...note }, i) => {
      const n = i + 1;
      if (image) writeFileSync(join(dir, `${n}.png`), Buffer.from(image.split(',')[1], 'base64'));
      return { n, ...note, image: image ? `${n}.png` : undefined };
    });
    writeFileSync(join(dir, 'notes.json'), JSON.stringify(written, null, 2));
    ignore(project);
    pending = [];
    console.log(`round: ${dir}`);
    return dir;
  });

  await context.addInitScript(picker);

  /* Closing the last window does not close Chrome on macOS: it lingers with
     no windows, the profile stays locked, and the next launch fails with
     "opening in existing browser session". Treat the last page going as the
     end, so the process exits and lets go of the profile. */
  const onPageClose = () => {
    if (context.pages().length === 0) context.close().catch(() => {});
  };
  context.on('page', (p) => p.on('close', onPageClose));

  const page = context.pages()[0] ?? (await context.newPage());
  page.on('close', onPageClose);
  await page.goto(url);
  console.log(`annotating ${url} → ${out}`);
  return context;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const url = args.find((a) => !a.startsWith('--'));
  const opt = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
  };
  if (!url) {
    console.error('usage: annotate.mjs <url> [--out <dir>] [--profile <dir>]');
    process.exit(2);
  }
  try {
    const context = await start({ url, out: opt('out'), profile: opt('profile') });
    context.on('close', () => process.exit(0));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
}
