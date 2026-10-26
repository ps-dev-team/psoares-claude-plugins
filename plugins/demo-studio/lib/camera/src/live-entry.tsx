// The live preview for the review page: window.DemoLive.mount(element, props)
// puts a Remotion Player on the Live composition and returns a small player
// API the page drives like a <video>.
import { Player, type PlayerRef } from '@remotion/player';
import { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Live, type LiveProps } from './Live';

type Listener = () => void;

const toDataUrl = async (src: string, cache: Map<string, string>) => {
  if (src.startsWith('data:')) return src;
  if (cache.has(src)) return cache.get(src)!;
  const blob = await (await fetch(src)).blob();
  const url = await new Promise<string>((ok) => { const r = new FileReader(); r.onload = () => ok(r.result as string); r.readAsDataURL(blob); });
  cache.set(src, url);
  return url;
};

function mount(el: HTMLElement, props: LiveProps) {
  const ref = createRef<PlayerRef>();
  const durationInFrames = Math.max(1, Math.round(props.length * props.fps));
  const root = createRoot(el);
  root.render(
    <Player ref={ref} component={Live} inputProps={props} durationInFrames={durationInFrames} fps={props.fps}
      compositionWidth={props.width} compositionHeight={props.height}
      style={{ width: '100%', height: '100%' }} controls={false} clickToPlay={false} doubleClickToFullscreen={false}
      numberOfSharedAudioTags={8} />,
  );
  const on: Record<string, Listener[]> = { timeupdate: [], play: [], pause: [] };
  const fire = (k: string) => on[k]?.forEach((f) => f());
  let wired = false;
  const wire = () => {
    const p = ref.current;
    if (!p || wired) return;
    wired = true;
    p.addEventListener('frameupdate', () => fire('timeupdate'));
    p.addEventListener('seeked', () => fire('timeupdate'));
    p.addEventListener('play', () => fire('play'));
    p.addEventListener('pause', () => fire('pause'));
    p.addEventListener('ended', () => fire('pause'));
  };
  const ready = setInterval(() => { wire(); if (wired) clearInterval(ready); }, 30);
  const images = new Map<string, string>();
  const api = {
    get duration() { return props.length; },
    get paused() { return !ref.current?.isPlaying(); },
    get currentTime() { return (ref.current?.getCurrentFrame() ?? 0) / props.fps; },
    set currentTime(t: number) { ref.current?.seekTo(Math.max(0, Math.min(durationInFrames - 1, Math.round(t * props.fps)))); fire('timeupdate'); },
    play() { ref.current?.play(); },
    pause() { ref.current?.pause(); },
    on(k: string, f: Listener) { (on[k] ??= []).push(f); },
    // A still of the frame on screen, drawn from the composition itself: its
    // markup with every image inlined, painted through an SVG.
    async still(width = 960): Promise<string> {
      const node = el.querySelector('[data-live-root]') as HTMLElement | null;
      if (!node) throw new Error('no live frame');
      const clone = node.cloneNode(true) as HTMLElement;
      for (const img of [...clone.querySelectorAll('img')]) img.setAttribute('src', await toDataUrl(img.getAttribute('src') ?? '', images));
      clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${props.width}" height="${props.height}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(clone)}</foreignObject></svg>`;
      const pic = new Image();
      await new Promise((ok, no) => { pic.onload = ok; pic.onerror = no; pic.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
      const c = document.createElement('canvas');
      c.width = width; c.height = Math.round(width * props.height / props.width);
      c.getContext('2d')!.drawImage(pic, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.82);
    },
    destroy() { clearInterval(ready); root.unmount(); },
  };
  return api;
}

(window as unknown as { DemoLive: { mount: typeof mount } }).DemoLive = { mount };
