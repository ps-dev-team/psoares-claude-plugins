import { Composition } from 'remotion';
import { Camera, type CameraProps } from './Camera';

const empty: CameraProps = {
  fps: 60, width: 1920, height: 1080, from: 0, duration: 1,
  view: { width: 2048, height: 1152 }, frames: [], moves: [], presses: [], zooms: [],
  pointer: { size: 34, show: true }, blur: { shutter: 360, samples: 16 },
};

export const Root = () => (
  <Composition
    id="Camera"
    component={Camera}
    defaultProps={empty}
    fps={60}
    width={1920}
    height={1080}
    durationInFrames={60}
    calculateMetadata={({ props }) => ({
      fps: props.fps,
      width: props.width,
      height: props.height,
      durationInFrames: Math.max(1, Math.round(props.duration * props.fps)),
    })}
  />
);
