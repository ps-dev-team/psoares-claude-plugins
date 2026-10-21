// The pointer, drawn large like Screen Studio's: a black arrow with a white
// edge and a soft shadow. (x, y) is the tip. A press squeezes it from the tip.
export const Pointer = ({ x, y, size, squeeze }: { x: number; y: number; size: number; squeeze: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    style={{
      position: 'absolute',
      left: x - (4 / 28) * size,
      top: y - (2 / 28) * size,
      transformOrigin: `${(4 / 28) * 100}% ${(2 / 28) * 100}%`,
      transform: `scale(${squeeze})`,
      filter: `drop-shadow(0 ${size * 0.06}px ${size * 0.1}px rgba(0,0,0,0.3))`,
      overflow: 'visible',
    }}
  >
    <path d="M5 3 L5 22 L10 17.5 L13.5 25 L17 23.5 L13.6 16 L20 16 Z" fill="#111" stroke="#fff" strokeWidth={1.7} strokeLinejoin="round" />
  </svg>
);
