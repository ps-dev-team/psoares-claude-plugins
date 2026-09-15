#!/usr/bin/env node
/**
 * Removes a handled round from `<cwd>/.annotations/`, so the directory only
 * ever holds what has not been read. Refuses anything that is not a round
 * folder (a plain child of .annotations containing notes.json), so a typo
 * cannot delete something else.
 *
 *   node done.mjs <stamp> [<stamp> ...] [--out <dir>]
 *   node done.mjs --all [--out <dir>]
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
};
const out = resolve(opt('out') ?? join(process.cwd(), '.annotations'));
const all = args.includes('--all');
const stamps = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');

if (!all && !stamps.length) {
  console.error('usage: done.mjs <stamp> [<stamp> ...] | --all   [--out <dir>]');
  process.exit(2);
}
if (!existsSync(out)) {
  console.log(`nothing pending: ${out} does not exist`);
  process.exit(0);
}

const isRound = (name) => existsSync(join(out, name, 'notes.json'));
const targets = all ? readdirSync(out).filter(isRound) : stamps.map((s) => basename(s));

let failed = false;
for (const name of targets) {
  if (!isRound(name)) {
    console.error(`not a round: ${join(out, name)} (no notes.json); left alone`);
    failed = true;
    continue;
  }
  rmSync(join(out, name), { recursive: true, force: true });
  console.log(`done: ${join(out, name)}`);
}
const left = readdirSync(out).filter(isRound).length;
console.log(left ? `${left} round(s) still pending` : 'no rounds pending');
process.exit(failed ? 1 : 0);
