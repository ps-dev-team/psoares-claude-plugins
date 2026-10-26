// The whole video, played live in the review page: the same parts, windows,
// frame, fades and voice that assemble.mjs renders, each window drawn by the
// same Camera from the same props. Nothing is rendered to a file.
import { AbsoluteFill, Audio, Img, Sequence, useCurrentFrame } from 'remotion';
import { Camera, type CameraProps } from './Camera';

export type LiveWindow = { box: { x: number; y: number; w: number; h: number } | null; props: CameraProps };
export type LivePart = { a: number; len: number; framed: boolean; back?: string; front?: string; windows: LiveWindow[] };
export type LiveProps = {
  fps: number;
  width: number;
  height: number;
  length: number;
  transition: { kind: string; seconds: number };
  parts: LivePart[];
  voice?: { src: string; pieces: { from: number; to: number; at: number }[] } | null;
};

// How a part shows during the fades at its edges, as ffmpeg's xfade draws
// them: `fade` crosses over; `fadewhite` and `fadeblack` go through the colour.
// Any other xfade transition is shown as a cross-fade.
const fadeOf = (kind: string, u: number, incoming: boolean) => {
  if (kind === 'fadewhite' || kind === 'fadeblack') return { opacity: incoming ? (u >= 0.5 ? 1 : 0) : u < 0.5 ? 1 : 0, wash: 1 - Math.abs(2 * u - 1) };
  return { opacity: incoming ? u : 1, wash: 0 };
};

const Part = ({ part, next, prev, fps, transition }: { part: LivePart; next?: LivePart; prev?: LivePart; fps: number; transition: LiveProps['transition'] }) => {
  const frame = useCurrentFrame();
  const t = frame / fps, T = transition.seconds;
  let opacity = 1, wash = 0;
  if (prev && t < T) ({ opacity, wash } = fadeOf(transition.kind, t / T, true));
  else if (next && t > part.len - T) ({ opacity, wash } = fadeOf(transition.kind, (t - (part.len - T)) / T, false));
  const color = transition.kind === 'fadeblack' ? '#000' : '#fff';
  return (
    <AbsoluteFill style={{ opacity }}>
      {part.back ? <Img src={part.back} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} /> : null}
      {part.windows.map((w, i) => (
        <div key={i} style={w.box ? { position: 'absolute', left: w.box.x, top: w.box.y, width: w.box.w, height: w.box.h, overflow: 'hidden' } : { position: 'absolute', inset: 0 }}>
          <Camera {...w.props} />
        </div>
      ))}
      {part.front ? <Img src={part.front} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} /> : null}
      {wash ? <AbsoluteFill style={{ backgroundColor: color, opacity: wash }} /> : null}
    </AbsoluteFill>
  );
};

export const Live = (props: LiveProps) => {
  const { fps, width, height, parts, voice, transition } = props;
  return (
    <div data-live-root="" style={{ position: 'relative', width, height, overflow: 'hidden', backgroundColor: '#fff' }}>
      {parts.map((part, k) => (
        <Sequence key={k} from={Math.round(part.a * fps)} durationInFrames={Math.max(1, Math.round(part.len * fps))} layout="none">
          <AbsoluteFill style={{ zIndex: k }}>
            <Part part={part} prev={parts[k - 1]} next={parts[k + 1]} fps={fps} transition={transition} />
          </AbsoluteFill>
        </Sequence>
      ))}
      {voice?.pieces.map((pc, i) => (
        <Sequence key={`a${i}`} from={Math.round(pc.at * fps)} durationInFrames={Math.max(1, Math.round((pc.to - pc.from) * fps))} layout="none">
          <Audio src={voice.src} trimBefore={Math.round(pc.from * fps)} />
        </Sequence>
      ))}
    </div>
  );
};
