/*
 * The picker, injected into every page of the annotate window by
 * annotate.mjs. A 16px dot, draggable anywhere and remembered per site;
 * click it and a strip unfolds: annotate on/off, send. With annotate on,
 * the pointer outlines whatever it is over with an inspector
 * tip (tag, slot, size, colour, background, font, radius); a click takes a
 * print-screen of the element among its surroundings, outlined in red, and
 * opens a note. Notes pile up as numbered pins; Send hands the round to the
 * process, which writes it into the project.
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

  const host = document.createElement('div');
  host.setAttribute('data-annotate-picker', '');
  /* The font goes on the inline style: `all: initial` there outranks any
     `:host` rule in the sheet, and would leave the widget in the browser's
     default serif. */
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  host.style.cssText = `all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;font:10px/1.2 ${MONO};color:#f1f1f4;`;
  const root = host.attachShadow({ mode: 'open' });
  const css = `
    * { box-sizing: border-box; }
    button, textarea { font: inherit; }
    button { cursor: pointer; border: 0; padding: 0; background: transparent; color: inherit; }
    .w { pointer-events: auto; position: fixed; display: flex; align-items: center; height: 16px; border-radius: 8px;
      background: #1c1c20; border: 1px solid #34343a; box-shadow: 0 2px 8px rgba(0,0,0,.35); user-select: none; }
    .w.flip { flex-direction: row-reverse; }
    .grip { position: relative; flex: none; width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: grab; }
    .grip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #8f8f98; }
    .w.on .grip::before { background: ${RED}; }
    .w.dragging .grip { cursor: grabbing; }
    .badge { position: absolute; top: -6px; right: -6px; min-width: 10px; height: 10px; padding: 0 2px; border-radius: 5px;
      background: #1c1c20; border: 1px solid #34343a; color: #f1f1f4; font-size: 8px; line-height: 8px; text-align: center; font-weight: 600; }
    .w:not(.collapsed) .badge { display: none; }
    .w.collapsed .strip { display: none; }
    .strip { display: flex; align-items: center; height: 14px; }
    .strip button { height: 14px; padding: 0 6px; color: #cfcfd6; white-space: nowrap; }
    .strip button:hover { color: #fff; }
    .w.on .strip .toggle { color: ${RED}; }
    .strip .send { color: #f1f1f4; font-weight: 600; }
    .strip .send:disabled { opacity: .35; cursor: default; }
    .strip .sep { width: 1px; height: 8px; background: #34343a; }
    .box { position: fixed; border-radius: 3px; pointer-events: none; }
    .box.hover { border: 2px solid ${RED}cc; }
    .box.pin { border: 1px solid ${RED}; }
    .tip { position: fixed; width: 220px; padding: 6px 8px; border-radius: 4px; background: rgba(20,20,23,.95); box-shadow: 0 4px 14px rgba(0,0,0,.35); pointer-events: none; }
    .tip div { display: flex; justify-content: space-between; gap: 10px; }
    .tip div span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tip .k { color: #8f8f98; } .tip .h { font-weight: 600; }
    .num { pointer-events: auto; position: absolute; top: -8px; left: -8px; display: flex; align-items: center; height: 16px; min-width: 16px; padding: 0 4px; border-radius: 8px; background: ${RED}; color: #fff; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .num button { margin-left: 2px; width: 12px; height: 12px; border-radius: 50%; color: #fff; line-height: 1; }
    .num button:hover { background: rgba(255,255,255,.25); }
    .editor { pointer-events: auto; position: fixed; width: 280px; display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 6px; background: #1c1c20; border: 1px solid #34343a; box-shadow: 0 8px 28px rgba(0,0,0,.45); font-size: 11px; }
    .editor img { width: 100%; max-height: 120px; object-fit: contain; object-position: left top; border-radius: 3px; border: 1px solid #34343a; background: #fff; }
    .editor .shot { height: 56px; border-radius: 3px; background: #232327; }
    .editor .path { font-size: 10px; color: #8f8f98; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .editor textarea { resize: none; width: 100%; padding: 6px 8px; font-size: 12px; border-radius: 4px; border: 1px solid #34343a; background: #141417; color: #f1f1f4; line-height: 1.4; outline: none; }
    .editor textarea:focus { border-color: #6b6b75; }
    .editor .row { display: flex; justify-content: flex-end; gap: 6px; }
    .editor .row button { height: 28px; padding: 0 12px; border-radius: 5px; color: #8f8f98; font-size: 12px; }
    .editor .row button:hover { background: #232327; color: #f1f1f4; }
    .editor .row button.add { background: #f1f1f4; color: #141417; font-weight: 600; }
    .editor .row button.add:disabled { opacity: .4; cursor: default; }
    .toast { pointer-events: none; position: fixed; padding: 4px 8px; border-radius: 4px; background: #1c1c20; border: 1px solid #34343a; color: #cfcfd6; white-space: nowrap; }
  `;
  root.innerHTML = `<style>${css}</style>
    <div class="w collapsed">
      <div class="grip" title=""><span class="badge" hidden></span></div>
      <div class="strip">
        <span class="sep"></span>
        <button class="toggle" aria-pressed="false">annotate</button>
        <span class="sep"></span>
        <button class="send" disabled>send</button>
      </div>
    </div>
    <div class="layer"></div>`;
  const widget = root.querySelector('.w');
  const grip = root.querySelector('.grip');
  const badge = root.querySelector('.badge');
  const toggleBtn = root.querySelector('.toggle');
  const sendBtn = root.querySelector('.send');
  const layer = root.querySelector('.layer');
  const mount = () => {
    (document.documentElement || document).appendChild(host);
    placeWidget();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  const cursorStyle = document.createElement('style');
  cursorStyle.textContent = 'html, html * { cursor: crosshair !important; }';

  /* -------------------------------- state ------------------------------- */

  let active = false;
  let hover = null;
  let draft = null; // { id, el, info, image, text }
  let local = []; // notes made on this page: { id, el, n }
  let count = 0;
  let seq = Date.now();

  const isOurs = (n) => n === host || (n && n.closest && n.closest('[data-annotate-picker]'));
  const rectOf = (el) => el.getBoundingClientRect();

  const refreshState = async () => {
    const s = await window.__annotateState();
    count = s.count;
    grip.title = `annotate · ${s.project}`;
    sendBtn.textContent = count ? `send ${count}` : 'send';
    sendBtn.disabled = !count;
    badge.textContent = count;
    badge.hidden = !count;
    placeWidget();
  };

  /* ------------------------------- widget ------------------------------- */

  /* The dot sits where the user left it, per site, and is the drag handle in
     both states. Open, the strip unfolds to the right, or to the left when
     that would run off screen; the dot itself never moves on open/close. */
  const POS_KEY = '__annotate.pos';
  let pos = (() => {
    try {
      const p = JSON.parse(localStorage.getItem(POS_KEY));
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
    } catch {}
    return { x: innerWidth - 26, y: 10 };
  })();
  const DOT = 16;

  function placeWidget() {
    pos.x = Math.min(Math.max(0, pos.x), innerWidth - DOT);
    pos.y = Math.min(Math.max(0, pos.y), innerHeight - DOT);
    widget.style.top = `${pos.y}px`;
    const w = widget.offsetWidth || DOT;
    const flip = pos.x + w > innerWidth - 2;
    widget.classList.toggle('flip', flip);
    widget.style.left = `${flip ? pos.x + DOT - w : pos.x}px`;
  }

  function setCollapsed(on) {
    widget.classList.toggle('collapsed', on);
    placeWidget();
  }

  grip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = pos.x, oy = pos.y;
    let moved = false;
    grip.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      widget.classList.add('dragging');
      pos = { x: ox + dx, y: oy + dy };
      placeWidget();
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      widget.classList.remove('dragging');
      if (moved) {
        try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch {}
      } else setCollapsed(!widget.classList.contains('collapsed'));
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
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
      if (!n.el.isConnected) continue;
      const r = rectOf(n.el);
      const box = el(
        `<div class="box pin"><span class="num">${n.n}<button title="Remove">×</button></span></div>`,
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
        render();
      };
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
      `<div class="tip">${rows
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
    const e = el(`<div class="editor">
      ${draft.image ? `<img alt="">` : `<div class="shot"></div>`}
      <div class="path"></div>
      <textarea rows="3" placeholder="What is wrong with it?"></textarea>
      <div class="row"><button class="cancel">cancel</button><button class="add">add ⌘↩</button></div>
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
    host.style.display = 'none';
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
      host.style.display = '';
    }
  }

  async function keep() {
    if (!draft || !draft.text.trim()) return;
    const { id, el: target, info, image, text } = draft;
    const n = await window.__annotateAdd({ id, note: text, ...info, image });
    local.push({ id, el: target, n });
    draft = null;
    await refreshState();
    render();
  }

  function cancel() {
    draft = null;
    render();
  }

  function setActive(on) {
    active = on;
    toggleBtn.setAttribute('aria-pressed', String(on));
    widget.classList.toggle('on', on);
    if (on) document.head.appendChild(cursorStyle);
    else cursorStyle.remove();
    hover = null;
    if (!on) draft = null;
    render();
  }

  toggleBtn.onclick = () => setActive(!active);
  sendBtn.onclick = async () => {
    const dir = await window.__annotateSend();
    local = [];
    draft = null;
    setActive(false);
    await refreshState();
    if (dir) toast(`sent → ${dir.split('/').slice(-2).join('/')}`);
  };

  function toast(msg) {
    const t = el(`<div class="toast"></div>`);
    t.textContent = msg;
    const below = pos.y + DOT + 6;
    t.style.top = `${below + 24 < innerHeight ? below : pos.y - 28}px`;
    root.appendChild(t);
    t.style.left = `${Math.min(Math.max(4, pos.x), innerWidth - t.offsetWidth - 4)}px`;
    setTimeout(() => t.remove(), 2500);
  }

  /* ------------------------------- events ------------------------------- */

  document.addEventListener(
    'mousemove',
    (e) => {
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
      if (!active || isOurs(e.target)) return;
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
  document.addEventListener(
    'keydown',
    (e) => {
      if (!active || e.key !== 'Escape') return;
      if (draft) cancel();
      else setActive(false);
    },
    true,
  );
  let raf = 0;
  const follow = () => {
    if (!local.length && !draft) return;
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
