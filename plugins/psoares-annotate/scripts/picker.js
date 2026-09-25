/*
 * The picker, injected into every page of the annotate window by
 * annotate.mjs. A small dark panel, dressed as the Product Studio's
 * prototype controls: dragged by its grip and folded by its chevron (both
 * remembered per site); open, it holds the mode (annotate or navigate), the
 * round's notes (jump to one, edit, delete, drag into order), Send, and the
 * keys. In annotate mode the pointer outlines whatever it is over with an
 * inspector tip (tag, slot, size, colour, background, font, radius); a click
 * takes a print-screen of the element among its surroundings, outlined in
 * red, and opens a note. Notes show on the page as numbered pins; Send hands
 * the round to the process, which writes it into the project.
 *
 * Backtick or acute accent (´) switches mode without the panel; the process
 * keeps the mode, so it survives navigation. Holding Alt/Option pauses
 * annotate mode: no outline, clicks reach the page, release to resume. In annotate mode, A opens a
 * note on the element under the pointer, as a click would; Esc closes it.
 *
 * Everything lives in a shadow root on <html>, so the page's CSS cannot
 * touch it and it cannot touch the page. Vanilla on purpose: it runs in
 * any app, whatever the app is written in.
 */
(() => {
  if (window.__annotatePicker) return;
  window.__annotatePicker = true;

  const PAD = 32;
  const RED = '#ef4444';

  /* ------------------------------ describe ------------------------------ */

  const slotChain = (el) => {
    const chain = [];
    for (let n = el; n; n = n.parentElement) {
      const slot = n.dataset && n.dataset.slot;
      if (!slot) continue;
      const bits = [slot];
      if (n.dataset.variant) bits.push(`variant=${n.dataset.variant}`);
      if (n.dataset.size) bits.push(`size=${n.dataset.size}`);
      if (n.dataset.state) bits.push(`state=${n.dataset.state}`);
      chain.unshift(bits.join(' '));
    }
    return chain.join(' > ');
  };

  const cssPath = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.id) {
        parts.unshift(`#${n.id}`);
        break;
      }
      const tag = n.tagName.toLowerCase();
      const siblings = n.parentElement
        ? [...n.parentElement.children].filter((c) => c.tagName === n.tagName)
        : [];
      parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(n) + 1})` : tag);
      if (parts.length > 10) break;
    }
    return parts.join(' > ');
  };

  const swatch = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const hex = (color) => {
    if (!swatch) return color;
    swatch.clearRect(0, 0, 1, 1);
    swatch.fillStyle = color;
    swatch.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = swatch.getImageData(0, 0, 1, 1).data;
    if (a === 0) return 'transparent';
    return (
      '#' +
      [r, g, b]
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    );
  };

  const describe = (el) => {
    const cs = getComputedStyle(el);
    const styles = {};
    for (const k of [
      'backgroundColor',
      'color',
      'borderColor',
      'borderWidth',
      'borderRadius',
      'padding',
      'margin',
      'gap',
      'fontFamily',
      'fontSize',
      'lineHeight',
      'fontWeight',
      'boxShadow',
    ])
      styles[k] = String(cs[k]);
    const attrs = {};
    for (const a of el.attributes)
      if (/^(data-|aria-|role$|type$|href$|disabled$|name$|placeholder$)/.test(a.name))
        attrs[a.name] = a.value;
    const r = el.getBoundingClientRect();
    return {
      url: location.href,
      route: location.pathname + location.search + location.hash,
      title: document.title,
      slots: slotChain(el),
      path: cssPath(el),
      tag: el.tagName.toLowerCase(),
      classes: String(el.className || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 16)
        .join(' '),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160),
      attrs,
      styles,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      rect: { x: r.x, y: r.y, width: r.width, height: r.height },
    };
  };

  /* ------------------------------- chrome ------------------------------- */

  const ALT = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌥' : 'Alt';

  /* Dressed as the Product Studio's prototype-controls panel: a dark mono
     panel, 11px on 16px, 10px radius, a grip to drag it by and a chevron to
     fold it, uppercase section labels, outlined options with the chosen one
     in yellow. The page's outlines and pins stay red. */
  const T = {
    font: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    surface: '#141416',
    raised: '#1c1c1f',
    border: '#3a3a40',
    divider: '#2a2a2f',
    text: '#d9d9de',
    bright: '#f1f1f3',
    option: '#b4b4bc',
    icon: '#8f8f98',
    muted: '#6f6f78',
    hoverBg: '#232327',
    hoverBorder: '#5a5a62',
    accent: '#f5c542',
    shadow: '0 1px 3px 0 rgba(0,0,0,.25)',
  };

  /* Icons from Lucide (https://lucide.dev), inlined: the page may have no
     network and the picker imports nothing. Lucide is ISC-licensed:
     Copyright (c) 2026 Lucide Icons and Contributors. Permission to use,
     copy, modify, and/or distribute this software for any purpose with or
     without fee is hereby granted, provided that the above copyright notice
     and this permission notice appear in all copies. chevron-down,
     chevron-up, trash-2 and x derive from Feather, MIT, Copyright (c)
     2013-present Cole Bemis. */
  const ICON = {
    grip: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronUp: '<path d="m18 15-6-6-6 6"/>',
    trash: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    note: '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>',
    pointer: '<path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>',
    eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  };
  const icon = (name, size = 14) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

  const host = document.createElement('div');
  host.setAttribute('data-annotate-picker', '');
  /* The page's selectors cannot reach into the shadow root, but the host
     element is the page's, and what it inherits flows in: a page rule like
     `* { font-family: X !important }` would dress the picker. So the host's
     inline style is all !important (inline important beats the page's
     important), and the sheet sets the font again on every top-level piece
     rather than trusting inheritance. */
  host.style.cssText = [
    'all:initial',
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'pointer-events:none',
    `font:11px/16px ${T.font}`,
    'letter-spacing:normal',
    `color:${T.text}`,
    '-webkit-font-smoothing:antialiased',
  ]
    .map((d) => `${d} !important`)
    .join(';');
  const root = host.attachShadow({ mode: 'open' });
  const css = `
    * { box-sizing: border-box; margin: 0; }
    .panel, .tip, .editor, .toast, .num { font: 11px/16px ${T.font}; letter-spacing: normal; color: ${T.text}; text-align: left; }
    button, textarea { font: inherit; letter-spacing: inherit; }
    button { cursor: pointer; border: 0; padding: 0; background: transparent; color: inherit; display: inline-flex; align-items: center; justify-content: center; }
    button:disabled { cursor: default; }
    svg { flex: none; display: block; }
    .surface { background: ${T.surface}; border: 1px solid ${T.border}; border-radius: 10px; box-shadow: ${T.shadow}; }
    .icon-btn { width: 24px; height: 24px; border-radius: 4px; color: ${T.icon}; }
    .icon-btn:hover { background: ${T.hoverBg}; color: ${T.text}; }
    .opt { gap: 4px; padding: 2px 6px; border-radius: 4px; border: 1px solid ${T.border}; color: ${T.option}; text-align: left; }
    .opt:hover { border-color: ${T.hoverBorder}; color: ${T.bright}; }
    .opt[aria-pressed="true"] { background: ${T.accent}; border-color: ${T.accent}; color: ${T.surface}; }
    .primary { gap: 6px; padding: 4px 8px; border-radius: 4px; border: 1px solid ${T.accent}; background: ${T.accent}; color: ${T.surface}; font-weight: 600; }
    .primary:disabled { opacity: .4; }
    .label { font-size: 10px; letter-spacing: .05em; text-transform: uppercase; color: ${T.muted}; }

    .panel { pointer-events: auto; position: fixed; width: 256px; overflow: hidden; user-select: none; }
    .panel.folded { width: auto; }
    .head { display: flex; align-items: center; gap: 4px; padding: 4px; }
    .panel:not(.folded) .head { border-bottom: 1px solid ${T.divider}; }
    .handle { display: flex; width: 24px; height: 24px; align-items: center; justify-content: center; border-radius: 4px; color: ${T.muted}; cursor: grab; touch-action: none; }
    .handle:hover { color: ${T.text}; }
    .panel.dragging .handle { cursor: grabbing; }
    .tag { padding: 2px 6px; border-radius: 4px; font-weight: 600; letter-spacing: .025em; text-transform: uppercase;
      border: 1px solid ${T.border}; color: ${T.option}; }
    .panel.on .tag { background: ${T.accent}; border-color: ${T.accent}; color: ${T.surface}; }
    .panel.on.paused .tag { background: transparent; color: ${T.accent}; }
    .count { min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: ${RED}; color: #fff; font-weight: 600; text-align: center; }
    .grow { flex: 1; min-width: 8px; }
    .panel.folded .content { display: none; }
    .content { display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; padding: 8px; }
    .sec { display: flex; flex-direction: column; gap: 4px; }
    .opts { display: flex; flex-wrap: wrap; gap: 4px; }
    .hint { font-size: 10px; color: ${T.muted}; }
    .keys { display: grid; grid-template-columns: auto 1fr; column-gap: 8px; font-size: 10px; color: ${T.muted}; }
    .keys b { font-weight: 400; color: ${T.option}; }
    .empty { color: ${T.muted}; }
    .items { display: flex; flex-direction: column; margin: 0 -4px; }
    .item { display: flex; align-items: flex-start; gap: 4px; padding: 4px; border-radius: 4px; cursor: pointer; }
    .item:hover { background: ${T.raised}; }
    .item.lifting { background: ${T.hoverBg}; box-shadow: ${T.shadow}; }
    .item .grab { display: flex; height: 20px; align-items: center; color: ${T.muted}; cursor: grab; touch-action: none; }
    .item .grab:hover { color: ${T.text}; }
    .item.lifting .grab { cursor: grabbing; }
    .item .n { flex: none; margin-top: 2px; }
    .item .body { flex: 1; min-width: 0; padding-top: 2px; }
    .item .text { color: ${T.bright}; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow-wrap: anywhere; }
    .item .route { font-size: 10px; color: ${T.muted}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .item.away .route::before { content: '↗ '; }
    .item .icon-btn { width: 20px; height: 20px; opacity: 0; }
    .item:hover .icon-btn { opacity: 1; }
    .item textarea, .editor textarea { display: block; width: 100%; resize: none; padding: 4px 6px; border-radius: 4px; border: 1px solid ${T.border};
      background: #0e0e10; color: ${T.bright}; outline: none; user-select: text; }
    .item textarea:focus, .editor textarea:focus { border-color: ${T.hoverBorder}; }
    .item .hint { margin-top: 2px; }
    .send { align-self: stretch; }

    .box { position: fixed; border-radius: 3px; pointer-events: none; }
    .box.hover { border: 2px solid ${RED}cc; }
    .box.pin { border: 1px solid ${RED}; }
    .box.flash { border: 2px solid ${RED}; box-shadow: 0 0 0 4px ${RED}40; }
    .num { pointer-events: auto; position: absolute; top: -9px; left: -9px; display: flex; align-items: center; gap: 2px; height: 18px; min-width: 18px; padding: 0 5px;
      border-radius: 9px; background: ${RED}; color: #fff; font-weight: 600; box-shadow: ${T.shadow}; }
    .num button { width: 14px; height: 14px; border-radius: 50%; color: #fff; }
    .num button:hover { background: rgba(255,255,255,.25); }

    .tip { position: fixed; width: 232px; padding: 6px 8px; pointer-events: none; }
    .tip div { display: flex; justify-content: space-between; gap: 12px; }
    .tip div span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${T.bright}; }
    .tip .k { color: ${T.muted}; } .tip .h { font-weight: 600; color: ${T.bright}; }

    .editor { pointer-events: auto; position: fixed; width: 288px; display: flex; flex-direction: column; gap: 8px; padding: 8px; }
    .editor img { width: 100%; max-height: 128px; object-fit: contain; object-position: left top; border-radius: 4px; border: 1px solid ${T.divider}; background: #fff; }
    .editor .shot { height: 56px; border-radius: 4px; background: ${T.raised}; }
    .editor .path { font-size: 10px; color: ${T.muted}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .editor .row { display: flex; justify-content: flex-end; gap: 4px; }
    .editor .row .opt, .editor .row .primary { padding: 2px 8px; }

    .toast { pointer-events: none; position: fixed; padding: 4px 8px; color: ${T.text}; white-space: nowrap; }
  `;
  root.innerHTML = `<style>${css}</style>
    <div class="panel surface" role="region" aria-label="Annotate">
      <div class="head">
        <span class="handle" role="presentation" title="Drag">${icon('grip')}</span>
        <span class="tag">navigate</span>
        <span class="count" hidden></span>
        <span class="grow"></span>
        <button class="fold icon-btn" type="button" tabindex="-1"></button>
      </div>
      <div class="content">
        <div class="sec">
          <span class="label">Mode</span>
          <div class="opts">
            <button class="opt" type="button" tabindex="-1" data-mode="annotate">${icon('note', 12)}Annotate</button>
            <button class="opt" type="button" tabindex="-1" data-mode="navigate">${icon('pointer', 12)}Navigate</button>
          </div>
        </div>
        <div class="sec">
          <span class="label">Notes</span>
          <div class="items"></div>
          <div class="empty">None yet. In annotate mode, click an element, or point at it and press A.</div>
        </div>
        <button class="send primary" type="button" tabindex="-1" disabled>${icon('send')}<span>Send</span></button>
        <div class="sec">
          <span class="label">Keys</span>
          <div class="keys">
            <b>\` or ´</b><span>annotate / navigate</span>
            <b>hold ${ALT}</b><span>pause annotating</span>
            <b>A</b><span>note what is under the pointer</span>
            <b>esc</b><span>close the note</span>
            <b>⌘↩</b><span>add the note</span>
          </div>
        </div>
      </div>
    </div>
    <div class="layer"></div>`;
  const panel = root.querySelector('.panel');
  const handle = root.querySelector('.handle');
  const tag = root.querySelector('.tag');
  const badge = root.querySelector('.count');
  const foldBtn = root.querySelector('.fold');
  const modeBtns = [...root.querySelectorAll('[data-mode]')];
  const sendBtn = root.querySelector('.send');
  const sendLabel = sendBtn.querySelector('span');
  const layer = root.querySelector('.layer');
  const items = root.querySelector('.items');
  const empty = root.querySelector('.empty');

  /* As in the Studio panel: presses on buttons take no focus (a modal in the
     page would pull it back), and no press on the panel reaches the page,
     where it could read as a click outside and close something. */
  root.addEventListener('mousedown', (e) => {
    if (e.target.closest && e.target.closest('button')) e.preventDefault();
  });
  for (const type of ['pointerdown', 'mousedown', 'click'])
    panel.addEventListener(type, (e) => e.stopPropagation());

  const mount = () => {
    (document.documentElement || document).appendChild(host);
    placeWidget();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  const cursorStyle = document.createElement('style');
  cursorStyle.textContent = 'html, html * { cursor: crosshair !important; }';

  /* -------------------------------- state ------------------------------- */

  let mode = 'navigate'; // or 'annotate'; the process holds the real value
  let paused = false; // Alt/Option held
  let active = false; // annotate mode and not paused: the picker is live
  let pointer = null; // last { x, y } seen, for the A key
  let hover = null;
  let draft = null; // { id, el, info, image, text }
  let local = []; // pins on this page: { id, el }
  let notes = []; // the whole round, in order: { id, note, url, route, path }
  let flash = null; // { el } outlined for a moment after a jump from the list
  let editing = null; // id of the note being edited in the list
  let count = 0;
  let seq = Date.now();

  const isOurs = (n) => n === host || (n && n.closest && n.closest('[data-annotate-picker]'));
  const rectOf = (el) => el.getBoundingClientRect();


  const refreshState = async () => {
    const s = await window.__annotateState();
    count = s.count;
    notes = s.notes;
    local = local.filter((p) => notes.some((n) => n.id === p.id));
    pinHere();
    if (s.mode !== mode) {
      mode = s.mode;
      if (mode === 'navigate') draft = null;
      apply();
    }
    const keys = `\` or ´ annotate / navigate · hold ${ALT} to pause · A notes the element under the pointer · esc closes the note`;
    handle.title = `Drag · annotating ${s.project}`;
    tag.title = keys;
    sendLabel.textContent = count ? `Send ${count} note${count === 1 ? '' : 's'}` : 'Send';
    sendBtn.disabled = !count;
    badge.textContent = count;
    badge.hidden = !count;
    renderList();
    placeWidget();
    render();
    if (s.focus != null) {
      const n = notes.find((x) => x.id === s.focus);
      if (n) jump(n, 3000);
    }
  };

  const nOf = (id) => notes.findIndex((n) => n.id === id) + 1;
  const samePage = (url) => {
    try {
      const a = new URL(url);
      return a.origin + a.pathname + a.search === location.origin + location.pathname + location.search;
    } catch {
      return false;
    }
  };
  const find = (n) => {
    const pin = local.find((p) => p.id === n.id);
    if (pin && pin.el.isConnected) return pin.el;
    try {
      return document.querySelector(n.path);
    } catch {
      return null;
    }
  };

  /* Notes made on this page before a reload or a navigation back get their
     pins again, found by CSS path. */
  function pinHere() {
    for (const n of notes) {
      if (local.some((p) => p.id === n.id) || !samePage(n.url)) continue;
      const found = find(n);
      if (found) local.push({ id: n.id, el: found });
    }
  }

  /* ------------------------------- widget ------------------------------- */

  /* Where the panel sits (its bottom-left corner, from the viewport's
     bottom-left, as in the Studio) and whether it is folded are kept per
     site. Folded, it is the header alone: the grip, the mode, the count. */
  const AT_KEY = '__annotate.at';
  const FOLD_KEY = '__annotate.folded';
  const recall = (key, fallback) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  };
  const keepLocal = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };
  let at = recall(AT_KEY, { left: 16, bottom: 16 });
  if (!at || !Number.isFinite(at.left) || !Number.isFinite(at.bottom)) at = { left: 16, bottom: 16 };

  function placeWidget() {
    at.left = Math.min(Math.max(0, at.left), Math.max(0, innerWidth - 80));
    at.bottom = Math.min(Math.max(0, at.bottom), Math.max(0, innerHeight - 40));
    panel.style.left = `${at.left}px`;
    panel.style.bottom = `${at.bottom}px`;
  }

  function setFolded(on) {
    panel.classList.toggle('folded', on);
    foldBtn.innerHTML = icon(on ? 'chevronUp' : 'chevronDown');
    foldBtn.setAttribute('aria-label', on ? 'Unfold the panel' : 'Fold the panel');
    foldBtn.title = on ? 'Unfold' : 'Fold';
  }
  setFolded(recall(FOLD_KEY, false) === true);
  foldBtn.onclick = () => {
    const on = !panel.classList.contains('folded');
    keepLocal(FOLD_KEY, on);
    setFolded(on);
  };

  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const sx = e.clientX, sy = e.clientY, from = { ...at };
    panel.classList.add('dragging');
    const move = (ev) => {
      at = { left: from.left + ev.clientX - sx, bottom: from.bottom - (ev.clientY - sy) };
      placeWidget();
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      panel.classList.remove('dragging');
      keepLocal(AT_KEY, at);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });

  const el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  const place = (r, w, h, gap) => {
    const below = r.y + r.height + gap;
    const top = below + h < innerHeight ? below : Math.max(4, r.y - h - gap);
    const left = Math.min(Math.max(4, r.x), innerWidth - w - 4);
    return { top, left };
  };

  /* ------------------------------- render ------------------------------- */

  function render() {
    layer.innerHTML = '';
    if (active && hover && !draft) {
      const r = rectOf(hover);
      const box = el('<div class="box hover"></div>');
      Object.assign(box.style, {
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      layer.append(box, tip(hover, r));
    }
    for (const n of local) {
      if (!n.el.isConnected || !nOf(n.id)) continue;
      const r = rectOf(n.el);
      const box = el(
        `<div class="box pin"><span class="num">${nOf(n.id)}<button title="Delete">${icon('x', 12)}</button></span></div>`,
      );
      Object.assign(box.style, {
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      box.querySelector('button').onclick = async () => {
        await window.__annotateRemove(n.id);
        local = local.filter((x) => x !== n);
        await refreshState();
      };
      layer.append(box);
    }
    if (flash && flash.el.isConnected) {
      const r = rectOf(flash.el);
      const box = el('<div class="box flash"></div>');
      Object.assign(box.style, {
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      layer.append(box);
    }
    if (draft) {
      const r = rectOf(draft.el);
      const box = el(`<div class="box hover"><span class="num">${count + 1}</span></div>`);
      Object.assign(box.style, {
        left: `${r.x}px`,
        top: `${r.y}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      });
      layer.append(box, editor(r));
    }
  }

  function tip(target, r) {
    const cs = getComputedStyle(target);
    const slot = target.dataset.slot;
    const head =
      target.tagName.toLowerCase() +
      (slot && slot !== target.tagName.toLowerCase() ? ` · ${slot}` : '') +
      (target.dataset.variant ? ` ${target.dataset.variant}` : '');
    const rows = [
      [head, `${Math.round(r.width)}×${Math.round(r.height)}`, true],
      ['color', hex(cs.color)],
      ['bg', hex(cs.backgroundColor)],
      ['font', `${cs.fontSize} ${(cs.fontFamily.split(',')[0] || '').replace(/["']/g, '')}`],
      ['radius', cs.borderRadius],
    ];
    const t = el(
      `<div class="tip surface">${rows
        .map(([k, v, h]) => `<div><span class="${h ? 'h' : 'k'}"></span><span></span></div>`)
        .join('')}</div>`,
    );
    [...t.children].forEach((row, i) => {
      row.children[0].textContent = rows[i][0];
      row.children[1].textContent = rows[i][1];
    });
    const { top, left } = place(r, 220, 96, 6);
    Object.assign(t.style, { top: `${top}px`, left: `${left}px` });
    return t;
  }

  function editor(r) {
    const e = el(`<div class="editor surface">
      ${draft.image ? `<img alt="">` : `<div class="shot"></div>`}
      <div class="path"></div>
      <textarea rows="3" placeholder="What is wrong with it?"></textarea>
      <div class="row"><button class="cancel opt" type="button">Cancel</button><button class="add primary" type="button">Add ⌘↩</button></div>
    </div>`);
    if (draft.image) e.querySelector('img').src = draft.image;
    e.querySelector('.path').textContent = draft.info.slots || draft.info.path;
    e.querySelector('.path').title = draft.info.path;
    const ta = e.querySelector('textarea');
    const add = e.querySelector('.add');
    ta.value = draft.text;
    add.disabled = !draft.text.trim();
    ta.oninput = () => {
      draft.text = ta.value;
      add.disabled = !ta.value.trim();
    };
    ta.onkeydown = (ev) => {
      if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) keep();
      if (ev.key === 'Escape') cancel();
      ev.stopPropagation();
    };
    e.querySelector('.cancel').onclick = cancel;
    add.onclick = keep;
    const { top, left } = place(r, 280, 230, 8);
    Object.assign(e.style, { top: `${top}px`, left: `${left}px` });
    requestAnimationFrame(() => ta.focus());
    return e;
  }

  /* ------------------------------- actions ------------------------------ */

  async function pick(target) {
    const info = describe(target);
    draft = { id: ++seq, el: target, info, image: undefined, text: '' };
    render();
    const image = await capture(target);
    if (draft && draft.el === target) {
      draft.image = image;
      render();
    }
  }

  /* The screenshot is the browser's own: hide our layer, outline the element
     (transition off, or a control would be caught mid-fade), let a frame
     paint, ask the process for the clip, put everything back. */
  async function capture(target) {
    const r = rectOf(target);
    const x0 = Math.max(0, r.x - PAD);
    const y0 = Math.max(0, r.y - PAD);
    const x1 = Math.min(innerWidth, r.x + r.width + PAD);
    const y1 = Math.min(innerHeight, r.y + r.height + PAD);
    const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    const was = target.getAttribute('style');
    /* !important: the host's inline style is all !important, and a plain
       `display: none` would lose to its `all: initial`. */
    host.style.setProperty('display', 'none', 'important');
    target.style.transition = 'none';
    target.style.outline = `2px solid ${RED}`;
    target.style.outlineOffset = '1px';
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    try {
      return await window.__annotateShot(clip);
    } catch (e) {
      console.warn('[annotate] capture failed', e);
      return undefined;
    } finally {
      if (was === null) target.removeAttribute('style');
      else target.setAttribute('style', was);
      host.style.removeProperty('display');
    }
  }

  async function keep() {
    if (!draft || !draft.text.trim()) return;
    const { id, el: target, info, image, text } = draft;
    const n = await window.__annotateAdd({ id, note: text, ...info, image });
    local.push({ id, el: target });
    draft = null;
    await refreshState();
  }

  function cancel() {
    draft = null;
    render();
  }

  /* Mode and pause decide whether the picker is live; the dot shows which:
     grey ring navigate, red dot annotate, red ring annotate paused. */
  function apply() {
    const annotating = mode === 'annotate';
    panel.classList.toggle('on', annotating);
    panel.classList.toggle('paused', annotating && paused);
    tag.textContent = annotating && paused ? 'paused' : mode;
    for (const b of modeBtns) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    const next = annotating && !paused;
    if (next === active) return;
    active = next;
    if (active) (document.head || document.documentElement).appendChild(cursorStyle);
    else cursorStyle.remove();
    hover = null;
    render();
  }

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    if (mode === 'navigate') draft = null;
    window.__annotateMode(mode);
    apply();
    render();
  }

  function setPaused(on) {
    if (on === paused) return;
    paused = on;
    apply();
  }

  for (const b of modeBtns) b.onclick = () => setMode(b.dataset.mode);
  sendBtn.onclick = async () => {
    const dir = await window.__annotateSend();
    local = [];
    draft = null;
    flash = null;
    setMode('navigate');
    await refreshState();
    if (dir) toast(`sent → ${dir.split('/').slice(-2).join('/')}`);
  };

  /* -------------------------------- list -------------------------------- */

  function renderList() {
    if (editing != null) return; // a rebuild would drop the text being typed
    items.replaceChildren(...notes.map(row));
    empty.hidden = notes.length > 0;
  }

  function row(n, i) {
    const r = el(`<div class="item" data-id="${n.id}">
      <span class="grab" title="Drag to reorder">${icon('grip')}</span>
      <span class="n count">${i + 1}</span>
      <div class="body"><div class="text"></div><div class="route"></div></div>
      <button class="edit icon-btn" type="button" tabindex="-1" title="Edit">${icon('pencil')}</button>
      <button class="del icon-btn" type="button" tabindex="-1" title="Delete">${icon('trash')}</button>
    </div>`);
    const away = !samePage(n.url);
    r.classList.toggle('away', away);
    r.querySelector('.text').textContent = n.note.split('\n')[0];
    r.querySelector('.text').title = n.note;
    const where = r.querySelector('.route');
    where.textContent = n.route || n.url;
    where.title = away ? `On another page: ${n.url}` : n.url;
    r.onclick = (e) => {
      if (e.target.closest('button, .grab, textarea')) return;
      jump(n);
    };
    r.querySelector('.edit').onclick = () => edit(r, n);
    r.querySelector('.del').onclick = async () => {
      await window.__annotateRemove(n.id);
      await refreshState();
    };
    r.querySelector('.grab').addEventListener('pointerdown', (e) => lift(e, r));
    return r;
  }

  function edit(r, n) {
    editing = n.id;
    const body = r.querySelector('.body');
    body.innerHTML = '<textarea rows="3"></textarea><div class="hint">⌘↩ save · esc cancel</div>';
    const ta = body.querySelector('textarea');
    ta.value = n.note;
    let done = false;
    const finish = async (save) => {
      if (done) return;
      done = true;
      editing = null;
      if (save && ta.value.trim() && ta.value !== n.note) await window.__annotateEdit(n.id, ta.value);
      await refreshState();
    };
    ta.onkeydown = (ev) => {
      if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) finish(true);
      if (ev.key === 'Escape') finish(false);
      ev.stopPropagation();
    };
    ta.onblur = () => finish(true);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  }

  /* Reorder by dragging the grip: the row moves among the others as the
     pointer passes their middles; the order goes to the process on release.
     Listened for on the window, not by pointer capture: moving the row in
     the DOM would drop the capture. */
  function lift(e, r) {
    if (e.button !== 0 || editing != null) return;
    e.preventDefault();
    const before = [...items.children].map((x) => x.dataset.id).join();
    r.classList.add('lifting');
    const move = (ev) => {
      const others = [...items.children].filter((x) => x !== r);
      const next = others.find((x) => {
        const b = x.getBoundingClientRect();
        return ev.clientY < b.top + b.height / 2;
      });
      if (next !== r.nextElementSibling) items.insertBefore(r, next || null);
    };
    const up = async () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      r.classList.remove('lifting');
      const ids = [...items.children].map((x) => x.dataset.id);
      if (ids.join() === before) return;
      await window.__annotateOrder(ids.map(Number));
      await refreshState();
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
  }

  /* Scroll to a note's element and outline it for a moment. A note from
     another page goes there first; the process hands the note back to the
     picker on the new page, which keeps looking for the element while the
     app renders. */
  async function jump(n, wait = 0) {
    if (!samePage(n.url)) {
      await window.__annotateFocus(n.id);
      location.href = n.url;
      return;
    }
    const until = Date.now() + wait;
    let target = find(n);
    while (!target && Date.now() < until) {
      await new Promise((res) => setTimeout(res, 150));
      target = find(n);
    }
    if (!target) {
      toast('That element is not on the page any more');
      return;
    }
    if (!local.some((p) => p.id === n.id)) local.push({ id: n.id, el: target });
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const mine = { el: target };
    flash = mine;
    render();
    setTimeout(() => {
      if (flash !== mine) return;
      flash = null;
      render();
    }, 1600);
  }

  function toast(msg) {
    const t = el(`<div class="toast surface"></div>`);
    t.textContent = msg;
    const p = panel.getBoundingClientRect();
    root.appendChild(t);
    t.style.top = `${p.top - 34 > 4 ? p.top - 34 : p.bottom + 6}px`;
    t.style.left = `${Math.min(Math.max(4, p.left), innerWidth - t.offsetWidth - 4)}px`;
    setTimeout(() => t.remove(), 2500);
  }

  /* ------------------------------- events ------------------------------- */

  document.addEventListener(
    'mousemove',
    (e) => {
      pointer = { x: e.clientX, y: e.clientY };
      setPaused(e.altKey);
      if (!active || draft) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      const next = t && !isOurs(t) ? t : null;
      if (next !== hover) {
        hover = next;
        render();
      }
    },
    true,
  );
  document.addEventListener(
    'click',
    (e) => {
      if (!active || e.altKey || isOurs(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (draft) return;
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (t && !isOurs(t)) {
        hover = null;
        pick(t);
      }
    },
    true,
  );
  /* The switch key: the backtick, or the acute accent for keyboards without
     one (Portuguese). The accent is often a dead key, reported as 'Dead'
     with the next character still to come, so it is known by its physical
     key: right of P on pt-PT (BracketRight), on pt-BR (BracketLeft), and
     the other spots accent keys sit in. Matching 'Dead' only there leaves
     the tilde and circumflex alone, and '+', which shares a key with an
     accent position on pt-PT, is never 'Dead'. */
  const ACCENT_CODES = new Set(['BracketRight', 'BracketLeft', 'Equal', 'Backquote']);
  const isSwitchKey = (e) =>
    e.key === '`' || e.key === '´' || (e.key === 'Dead' && ACCENT_CODES.has(e.code));

  /* Typing never switches mode: not in the page's fields, not in ours. */
  const typing = (e) => {
    const t = e.composedPath()[0];
    return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''));
  };
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Alt') {
        setPaused(true);
        return;
      }
      /* In a field, keys belong to it; the note box handles its own Esc. */
      if (typing(e)) return;
      if (
        isSwitchKey(e) &&
        !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat && !typing(e)
      ) {
        e.preventDefault();
        e.stopPropagation();
        setMode(mode === 'annotate' ? 'navigate' : 'annotate');
        return;
      }
      if (e.key === 'Escape' && draft) {
        cancel();
        return;
      }
      if (!active) return;
      if (e.key === 'Escape') {
        setMode('navigate');
        return;
      }
      /* A does what a click on the hovered element would. */
      if (
        (e.key === 'a' || e.key === 'A') &&
        !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.repeat &&
        !draft && pointer && !typing(e)
      ) {
        const t = hover || document.elementFromPoint(pointer.x, pointer.y);
        if (!t || isOurs(t)) return;
        e.preventDefault();
        e.stopPropagation();
        hover = null;
        pick(t);
      }
    },
    true,
  );
  document.addEventListener('keyup', (e) => e.key === 'Alt' && setPaused(false), true);
  /* Alt released in another window never sends a keyup here. */
  addEventListener('blur', () => setPaused(false));
  /* Another tab may have switched mode meanwhile. */
  addEventListener('focus', refreshState);
  /* Apps that render after load: look for this page's pins once more. */
  addEventListener('load', () => setTimeout(refreshState, 500));
  let raf = 0;
  const follow = () => {
    if (!local.length && !draft && !flash) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  };
  addEventListener('scroll', follow, true);
  addEventListener('resize', () => {
    placeWidget();
    follow();
  });

  refreshState();
})();
