// What differs between operating systems: where Chrome lives, and how to keep
// the machine awake during a take. Everything else in lib/ is the same on all.
import fs from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';

export const OS = process.platform; // 'darwin' | 'linux' | 'win32'

// config.chrome wins; otherwise the usual install paths for Google Chrome.
export const chromePath = (config = {}) => {
  if (config.chrome) return config.chrome.replace(/^~/, process.env.HOME ?? '');
  const candidates = {
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome'],
    win32: [
      `${process.env['PROGRAMFILES'] ?? 'C:\\Program Files'}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)'}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.LOCALAPPDATA ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
    ],
  }[OS] ?? [];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`Google Chrome not found for ${OS}. Set "chrome" in video.config.json to its path.`);
  return found;
};

const has = (cmd) => spawnSync(OS === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' }).status === 0;

// A locked or sleeping screen stops Chrome painting and the take stalls. On
// macOS `caffeinate`, on Linux `systemd-inhibit`, both tied to this process.
// Windows has no built-in command: the user keeps the screen on themselves.
export const keepAwake = () => {
  if (OS === 'darwin' && has('caffeinate')) {
    spawn('caffeinate', ['-dimsu', '-w', String(process.pid)], { stdio: 'ignore', detached: true }).unref();
    return 'caffeinate';
  }
  if (OS === 'linux' && has('systemd-inhibit')) {
    spawn('systemd-inhibit', ['--what=idle:sleep', '--why=recording a video', 'sh', '-c', `while kill -0 ${process.pid} 2>/dev/null; do sleep 5; done`],
      { stdio: 'ignore', detached: true }).unref();
    return 'systemd-inhibit';
  }
  console.warn('Keep the screen on and unlocked during the take: a sleeping screen stalls Chrome.');
  return null;
};
