// The pointer, drawn large like Screen Studio's, in the shape the page showed:
// a black arrow with a white edge, a white hand over what can be clicked, an
// I-beam over text. (x, y) is the hot spot. A press squeezes it from there.
type Props = { x: number; y: number; size: number; squeeze: number; tilt?: number; shape?: string };

// Each shape: its path in a 28-unit box, and its hot spot in that box.
const SHAPES: Record<string, { hot: [number, number]; draw: (stroke: number) => JSX.Element }> = {
  arrow: {
    hot: [5, 3],
    draw: (w) => <path d="M5 3 L5 22 L10 17.5 L13.5 25 L17 23.5 L13.6 16 L20 16 Z" fill="#111" stroke="#fff" strokeWidth={w} strokeLinejoin="round" />,
  },
  hand: {
    hot: [11, 3],
    draw: (w) => (
      <path
        d="M9.6 4.2c0-1.1.8-1.9 1.8-1.9s1.8.8 1.8 1.9v7.3c.2-1 1-1.6 1.9-1.6s1.7.7 1.8 1.7c.2-.9 1-1.5 1.9-1.5 1 0 1.8.8 1.8 1.8v.4c.3-.6.9-1 1.6-1 1 0 1.8.8 1.8 1.8v5.1c0 4.1-2.9 7.1-6.9 7.1h-2c-2.2 0-3.8-.9-5-2.6l-3.6-5.2c-.6-.9-.4-2 .4-2.6.8-.6 1.9-.4 2.5.4l1.2 1.6V4.2z"
        fill="#fff" stroke="#111" strokeWidth={w * 0.85} strokeLinejoin="round"
      />
    ),
  },
  ibeam: {
    hot: [14, 14],
    draw: (w) => (
      <g fill="none" strokeLinecap="round">
        <path d="M10.5 5c2 0 3.5.7 3.5 2v14c0 1.3-1.5 2-3.5 2M17.5 5c-2 0-3.5.7-3.5 2v14c0 1.3 1.5 2 3.5 2M11.5 14h5" stroke="#fff" strokeWidth={w * 2.4} />
        <path d="M10.5 5c2 0 3.5.7 3.5 2v14c0 1.3-1.5 2-3.5 2M17.5 5c-2 0-3.5.7-3.5 2v14c0 1.3 1.5 2 3.5 2M11.5 14h5" stroke="#111" strokeWidth={w * 0.9} />
      </g>
    ),
  },
};

export const Pointer = ({ x, y, size, squeeze, tilt = 0, shape = 'arrow' }: Props) => {
  const s = SHAPES[shape] ?? SHAPES.arrow;
  const [hx, hy] = s.hot;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      style={{
        position: 'absolute',
        left: x - (hx / 28) * size,
        top: y - (hy / 28) * size,
        transformOrigin: `${(hx / 28) * 100}% ${(hy / 28) * 100}%`,
        transform: `rotate(${tilt}deg) scale(${squeeze})`,
        filter: `drop-shadow(0 ${size * 0.06}px ${size * 0.1}px rgba(0,0,0,0.3))`,
        overflow: 'visible',
      }}
    >
      {s.draw(1.7)}
    </svg>
  );
};
