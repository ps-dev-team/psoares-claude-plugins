// One recorded window, redrawn with its pointer and its zoom.
//
// The picture is the recorder's frames (each shown from its arrival time), the
// pointer is drawn from the recorded moves and presses, and the camera eases
// between the zooms the beats asked for with Screen Studio's spring. Motion
// blur is on only while the camera moves.
import { CameraMotionBlur } from '@remotion/motion-blur';
import { useMemo } from 'react';
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame } from 'remotion';
import { Pointer, type CursorImage } from './Pointer';

export type Zoom = { t: number; scale: number; x: number; y: number };
export type CameraProps = {
  fps: number;
  width: number;
  height: number;
  /** Where this clip starts in the recording, in seconds. */
  from: number;
  duration: number;
  /** The window's CSS size; moves and zooms are in CSS pixels. */
  view: { width: number; height: number };
  /** [file in the public dir, arrival time in seconds] */
  frames: [string, number][];
  /** [time, x, y, shape] (shape: arrow | hand | ibeam; older takes have none) */
  moves: [number, number, number, string?][];
  /** [time, 1 down | 0 up] */
  presses: [number, number][];
  zooms: Zoom[];
  pointer: { size: number; show: boolean; blur?: boolean; images?: Record<string, CursorImage> | null };
  blur: { shutter: number; samples: number };
};

// Screen Studio's spring as it plays on screen, measured frame by frame from
// the user's video 02: critically damped. Its project file says the camera and
// the mouse share one spring (mass 1.5, stiffness 125, damping 12, clamped),
// but those numbers are in Screen Studio's own units: taken literally here
// they bounce, and the clamp cuts the bounce into steps.
export const SPRING = { mass: 1, stiffness: 169, damping: 26 };
const SETTLE = 0.6; // seconds until the spring has visibly settled

// The last item whose time is at or before t (items sorted by time).
const at = <T,>(list: T[], t: number, time: (x: T) => number) => {
  let lo = 0, hi = list.length - 1, best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (time(list[mid]) <= t) { best = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return best;
};

type Cam = { s: number; x: number; y: number };

// The camera at time t: each zoom eases from wherever the camera was when it
// began, so a new zoom can start before the last one has settled.
const cameraAt = (zooms: Zoom[], t: number, fps: number, view: CameraProps['view']): Cam => {
  const rest: Cam = { s: 1, x: view.width / 2, y: view.height / 2 };
  let cam = rest;
  for (let i = 0; i < zooms.length && zooms[i].t <= t; i++) {
    const z = zooms[i];
    const next = zooms[i + 1];
    const end = next && next.t <= t ? next.t : t;
    const p = spring({ frame: (end - z.t) * fps, fps, config: SPRING });
    const to: Cam = z.scale <= 1 ? { ...rest, x: cam.x, y: cam.y, s: 1 } : { s: z.scale, x: z.x, y: z.y };
    cam = { s: cam.s + (to.s - cam.s) * p, x: cam.x + (to.x - cam.x) * p, y: cam.y + (to.y - cam.y) * p };
  }
  return cam;
};

const moving = (zooms: Zoom[], t: number) => zooms.some((z) => t > z.t && t < z.t + SETTLE);

// Where the recorded pointer was at time t.
const rawAt = (moves: CameraProps['moves'], t: number, view: CameraProps['view']): [number, number] => {
  const mi = at(moves, t, (m) => m[0]);
  if (mi < 0) return [view.width / 2, view.height / 2];
  const a = moves[mi], b = moves[mi + 1];
  if (b && b[0] > a[0] && b[0] - a[0] < 0.1) {
    const u = (t - a[0]) / (b[0] - a[0]);
    return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  }
  return [a[1], a[2]];
};

// The drawn pointer follows the recorded one on the same spring as the camera,
// as Screen Studio's does, and stops on its target instead of swinging past.
// It returns [x, y, vx] per frame; vx tilts the pointer.
const glide = (moves: CameraProps['moves'], view: CameraProps['view'], from: number, duration: number, fps: number) => {
  const { mass, stiffness: k, damping: c } = SPRING;
  const dt = 1 / 480, start = from - 1, end = from + duration;
  let [x, y] = rawAt(moves, start, view);
  let vx = 0, vy = 0;
  const out: [number, number, number][] = [];
  let next = from;
  const step = (p: number, v: number, target: number) => {
    const before = target - p;
    v += ((k * before - c * v) / mass) * dt;
    p += v * dt;
    if (before !== 0 && Math.sign(target - p) !== Math.sign(before)) return [target, 0];
    return [p, v];
  };
  for (let t = start; t <= end + dt; t += dt) {
    const [tx, ty] = rawAt(moves, t, view);
    [x, vx] = step(x, vx, tx);
    [y, vy] = step(y, vy, ty);
    while (t >= next && out.length <= duration * fps) { out.push([x, y, vx]); next = from + out.length / fps; }
  }
  return out;
};

// macOS grows the cursor when you shake the mouse, so you can find it. Here:
// three or more quick turns side to side within half a second, each a real
// swing (not a rest's few pixels), and the cursor grows; it shrinks back
// slowly once the shaking stops. One value per frame.
const GROW = 2.2;
const growth = (moves: CameraProps['moves'], from: number, duration: number, fps: number) => {
  const out: number[] = [];
  let g = 1;
  for (let f = 0; f <= duration * fps; f++) {
    const t = from + f / fps;
    let turns = 0, dir = 0, run = 0;
    for (let i = Math.max(1, at(moves, t - 0.5, (m) => m[0]) + 1); i < moves.length && moves[i][0] <= t; i++) {
      const dx = moves[i][1] - moves[i - 1][1];
      if (!dx) continue;
      const d = Math.sign(dx);
      if (d === dir) run += Math.abs(dx);
      else { if (dir && run > 30) turns++; dir = d; run = Math.abs(dx); }
    }
    const target = turns >= 3 ? GROW : 1;
    g += (target - g) * (target > g ? 0.22 : 0.07);
    out.push(g);
  }
  return out;
};

const Scene = (props: CameraProps) => {
  const frame = useCurrentFrame();
  const { fps, width, height, view, frames, moves, presses, zooms, pointer, from } = props;
  const t = from + frame / fps;
  const k = width / view.width; // CSS pixel -> output pixel
  const cam = cameraAt(zooms, t, fps, view);
  // Keep the picture covering the window: the view never leaves its edges.
  const half = { x: view.width / 2 / cam.s, y: view.height / 2 / cam.s };
  const cx = Math.min(Math.max(cam.x, half.x), view.width - half.x);
  const cy = Math.min(Math.max(cam.y, half.y), view.height - half.y);
  const tx = width / 2 - cx * k * cam.s, ty = height / 2 - cy * k * cam.s;

  const fi = Math.max(0, at(frames, t, (f) => f[1]));
  const path = useMemo(() => glide(moves, view, from, props.duration, fps), [moves, view, from, props.duration, fps]);
  const [px, py, pvx] = path[Math.min(frame, path.length - 1)] ?? [...rawAt(moves, t, view), 0];
  const grows = useMemo(() => growth(moves, from, props.duration, fps), [moves, from, props.duration, fps]);
  const grow = grows[Math.min(frame, grows.length - 1)] ?? 1;
  // Motion blur on the pointer alone, as Screen Studio's: the cursor is drawn
  // along the way it travelled during this frame, copies stacked so they add
  // up to a solid cursor where they overlap and a smear where they spread.
  // Still, it is one sharp cursor. The camera itself is never blurred.
  const prev = path[Math.max(0, Math.min(frame, path.length - 1) - 1)] ?? [px, py, 0];
  const travel = Math.hypot(px - prev[0], py - prev[1]) * k * cam.s;
  const copies = pointer.blur === false || travel < 4 ? 1 : Math.min(12, Math.ceil(travel / 5));
  const each = copies === 1 ? 1 : 1 - Math.pow(0.04, 1 / copies);
  const smear: [number, number, number][] = Array.from({ length: copies }, (_, i) => {
    const u = copies === 1 ? 1 : i / (copies - 1);
    return [prev[0] + (px - prev[0]) * u, prev[1] + (py - prev[1]) * u, each];
  });
  // Screen Studio tilts its cursor with horizontal speed (rotationMode: velocity).
  const tilt = Math.max(-14, Math.min(14, pvx * 0.006));
  // The shape the page showed under the real pointer, a beat behind it, so the
  // hand appears as the drawn pointer arrives (Screen Studio records the same).
  const si = at(moves, t - 0.05, (m) => m[0]);
  let shape = (si >= 0 && moves[si][3]) || 'arrow';
  // The hand only for a click: from just before the press to just after the
  // release, wherever the page would show it. Elsewhere it is the arrow.
  // A shape of its own (an open hand on a drag handle, an I-beam) stays.
  const plain = shape === 'hand' || shape === 'arrow';
  if (shape === 'hand') shape = 'arrow';
  const near = presses.some(([pt, d]) => (d === 1 ? t >= pt - 0.4 && t <= pt + 0.1 : t >= pt - 0.1 && t <= pt + 0.3));
  if (near && plain) shape = 'hand';
  // Held down for a moment: a drag, so a closed hand.
  const last = at(presses, t, (q) => q[0]);
  if (last >= 0 && presses[last][1] === 1 && t - presses[last][0] > 0.12) shape = 'closedhand';
  const pi = at(presses, t, (p) => p[0]);
  const since = pi >= 0 ? t - presses[pi][0] : 99;
  const down = pi >= 0 && presses[pi][1] === 1;
  const press = spring({ frame: since * fps, fps, config: SPRING });
  const squeeze = down ? 1 - 0.18 * press : 0.82 + 0.18 * press;

  return (
    <AbsoluteFill style={{ backgroundColor: '#fff', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width, height, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${cam.s})` }}>
        {frames.length ? <Img src={staticFile(frames[fi][0])} style={{ width, height, display: 'block' }} /> : null}
        {pointer.show
          ? smear.map(([sx, sy, o], i) => (
              <div key={i} style={{ opacity: o }}>
                <Pointer x={sx * k} y={sy * k} size={pointer.size * k * grow} squeeze={squeeze} tilt={shape === 'arrow' ? tilt : 0} shape={shape} image={pointer.images?.[shape] ?? pointer.images?.arrow} />
              </div>
            ))
          : null}
      </div>
    </AbsoluteFill>
  );
};

export const Camera = (props: CameraProps) => {
  const frame = useCurrentFrame();
  const t = props.from + frame / props.fps;
  if (props.blur.samples > 1 && moving(props.zooms, t)) {
    return (
      <CameraMotionBlur shutterAngle={props.blur.shutter} samples={props.blur.samples}>
        <Scene {...props} />
      </CameraMotionBlur>
    );
  }
  return <Scene {...props} />;
};
