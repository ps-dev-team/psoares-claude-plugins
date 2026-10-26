// node run.mjs <project> <id> [segment]: records a video's segments in order.
// Each segment opens its windows, runs its setup off camera, records its
// beats, runs its cleanup, and closes the windows (saving their sessions).
import { loadProject, loadVideo } from './project.mjs';
import { openWindow, record, closeWindow, closeAll } from './rec.mjs';
import { keepAwake } from './os.mjs';

const [dir, id, only] = process.argv.slice(2);
if (!dir || !id) { console.error('usage: node run.mjs <project> <id> [segment]'); process.exit(2); }
const project = loadProject(dir);
keepAwake();
const { segments, length } = await loadVideo(project, id);
const PAD = project.config.transition.pad; // each segment overlaps its neighbour, for the transition
for (const [k, s] of segments.entries()) {
  if (only && s.name !== only) continue;
  const windows = [];
  for (const [i, spec] of s.windows.entries()) windows.push(await openWindow(project, spec.account, { url: spec.url, x: i * 60, view: spec.view }));
  if (s.setup) await s.setup(...windows);
  const start = k === 0 ? 0 : Math.max(0, s.start - PAD);
  const end = k === segments.length - 1 ? length : segments[k + 1].start + PAD;
  await record(project, { id, seg: s.name, windows, start, end, beats: s.beats(...windows) });
  if (s.cleanup) await s.cleanup(...windows);
  for (const w of windows) await closeWindow(w);
}
await closeAll();
process.exit(0);
