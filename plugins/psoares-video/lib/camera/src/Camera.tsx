// One recorded window, redrawn with its pointer and its zoom.
//
// The picture is the recorder's frames (each shown from its arrival time), the
// pointer is drawn from the recorded moves and presses, and the camera eases
// between the zooms the beats asked for with Screen Studio's spring. Motion
// blur is on only while the camera moves.
import { CameraMotionBlur } from '@remotion/motion-blur';
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame } from 'remotion';
import { Pointer } from './Pointer';

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
  /** [time, x, y] */
  moves: [number, number, number][];
  /** [time, 1 down | 0 up] */
  presses: [number, number][];
  zooms: Zoom[];
  pointer: { size: number; show: boolean };
  blur: { shutter: number; samples: number };
};

// Screen Studio's spring, measured frame by frame: critically damped.
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
  const mi = at(moves, t, (m) => m[0]);
  let px = view.width / 2, py = view.height / 2;
  if (mi >= 0) {
    const a = moves[mi], b = moves[mi + 1];
    if (b && b[0] > a[0] && b[0] - a[0] < 0.1) {
      const u = (t - a[0]) / (b[0] - a[0]);
      px = a[1] + (b[1] - a[1]) * u; py = a[2] + (b[2] - a[2]) * u;
    } else { px = a[1]; py = a[2]; }
  }
  const pi = at(presses, t, (p) => p[0]);
  const since = pi >= 0 ? t - presses[pi][0] : 99;
  const down = pi >= 0 && presses[pi][1] === 1;
  const press = spring({ frame: since * fps, fps, config: SPRING });
  const squeeze = down ? 1 - 0.18 * press : 0.82 + 0.18 * press;

  return (
    <AbsoluteFill style={{ backgroundColor: '#fff', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width, height, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${cam.s})` }}>
        {frames.length ? <Img src={staticFile(frames[fi][0])} style={{ width, height, display: 'block' }} /> : null}
        {pointer.show ? <Pointer x={px * k} y={py * k} size={pointer.size * k} squeeze={squeeze} /> : null}
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
