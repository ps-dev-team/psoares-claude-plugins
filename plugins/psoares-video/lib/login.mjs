// node login.mjs <project> <account>: opens the account's Chrome profile in
// plain Chrome, with no automation, on the app's sign-in page. A person signs
// in (captchas such as Turnstile refuse a window Playwright drives) and closes
// the window; the profile keeps the session, so recordings open signed in. Run
// again only when a recording window opens signed out.
//
// config.app.login is the sign-in path (default /login).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadProject } from './project.mjs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const [dir, account] = process.argv.slice(2);
if (!dir || !account) { console.error('usage: node login.mjs <project> <account>'); process.exit(2); }
const project = loadProject(dir);
const { config } = project;
const acct = config.accounts[account];
if (!acct) { console.error(`no account "${account}"`); process.exit(2); }
const profiles = config.profiles ? config.profiles.replace(/^~/, process.env.HOME) : project.p('raw');
const profile = path.join(profiles, `profile-${account}`);
fs.mkdirSync(profile, { recursive: true });
const url = config.app.base + (config.app.login ?? '/login');

console.log(`${account}: sign in as ${acct.email ?? '(see the config)'}${acct.password ? ` / ${acct.password}` : ''}, then close the window.`);
// The same keychain flags Playwright uses, so the recorder can read the
// cookies this window saves.
const chrome = spawn(CHROME, [
  `--user-data-dir=${profile}`, '--use-mock-keychain', '--password-store=basic',
  '--no-first-run', '--no-default-browser-check', '--window-position=120,60', '--window-size=1280,900', url,
], { stdio: 'ignore' });
chrome.on('exit', () => console.log(`${account}: window closed, profile saved`));
