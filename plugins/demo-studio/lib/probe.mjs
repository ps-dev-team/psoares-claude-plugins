// node probe.mjs <project> <account|-> <url> [snippet.js]: opens a window, runs
// an optional snippet, then writes the page's accessibility tree and a
// screenshot to raw/probe-<OUT>.{aria.txt,png}. Use it before writing beats,
// so every button name comes from the page, not from a guess.
//
// The snippet runs with (w, page, sleep, snap); snap('name') saves a mid-way
// state. VIEW=1024x1152 opens the window at another CSS size.
import fs from 'node:fs';
import { loadProject } from './project.mjs';
import { openWindow, sleep, closeAll } from './rec.mjs';

const [dir, account, url, snippet] = process.argv.slice(2);
if (!dir || !account || !url) { console.error('usage: node probe.mjs <project> <account|-> <url> [snippet.js]'); process.exit(2); }
const project = loadProject(dir);
const view = process.env.VIEW ? (([w, h]) => ({ width: +w, height: +h }))(process.env.VIEW.split('x')) : undefined;
const w = await openWindow(project, account === '-' ? null : account, { url, view });
const page = w.page;
const snap = async (n) => {
  fs.writeFileSync(project.p('raw', `probe-${n}.aria.txt`), await page.locator('body').ariaSnapshot());
  await page.screenshot({ path: project.p('raw', `probe-${n}.png`), scale: 'css' });
};
if (snippet) {
  const fn = new Function('w', 'page', 'sleep', 'snap', `return (async () => { ${fs.readFileSync(snippet, 'utf8')} })()`);
  await fn(w, page, sleep, snap);
}
await sleep(800);
await snap(process.env.OUT || 'page');
console.log(page.url());
console.log(`wrote raw/probe-${process.env.OUT || 'page'}.aria.txt and .png`);
await closeAll();
process.exit(0);
