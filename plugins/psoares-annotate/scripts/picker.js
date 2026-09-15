/*
 * The picker, injected into every page of the annotate window by
 * annotate.mjs. A pill at the top right: Annotate on/off, Send. With
 * Annotate on, the pointer outlines whatever it is over with an inspector
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
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
  const root = host.attachShadow({ mode: 'open' });
  const css = `
    :host { font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; color: #f1f1f4; }
    * { box-sizing: border-box; }
    button { font: inherit; cursor: pointer; border: 0; }
    .pill { pointer-events: auto; position: fixed; top: 10px; right: 10px; display: flex; align-items: center; gap: 4px;
      padding: 4px; border-radius: 999px; background: #1c1c20; border: 1px solid #34343a; box-shadow: 0 4px 16px rgba(0,0,0,.35); }
    .pill button { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 999px; background: transparent; color: #cfcfd6; }
    .pill button:hover { background: #2a2a2f; color: #fff; }
    .pill button[aria-pressed="true"] { background: ${RED}; color: #fff; }
    .pill button.send { background: #f1f1f4; color: #141417; font-weight: 600; }
    .pill button.send:disabled { opacity: .35; cursor: default; }
    .pill .where { padding: 0 10px 0 8px; color: #8f8f98; font-family: ui-monospace, monospace; font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
    .box { position: fixed; border-radius: 3px; pointer-events: none; }
    .box.hover { border: 2px solid ${RED}cc; }
    .box.pin { border: 1px solid ${RED}; }
    .tip { position: fixed; width: 260px; padding: 8px 10px; border-radius: 6px; background: rgba(20,20,23,.95); font-family: ui-monospace, monospace; font-size: 11px; box-shadow: 0 6px 20px rgba(0,0,0,.35); pointer-events: none; }
    .tip div { display: flex; justify-content: space-between; gap: 12px; }
    .tip div span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tip .k { color: #8f8f98; } .tip .h { font-weight: 600; }
    .num { pointer-events: auto; position: absolute; top: -10px; left: -10px; display: flex; align-items: center; height: 20px; min-width: 20px; padding: 0 5px; border-radius: 999px; background: ${RED}; color: #fff; font: 600 11px ui-monospace, monospace; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
    .num button { margin-left: 3px; width: 14px; height: 14px; border-radius: 50%; background: transparent; color: #fff; padding: 0; line-height: 1; }
    .num button:hover { background: rgba(255,255,255,.25); }
    .editor { pointer-events: auto; position: fixed; width: 320px; display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: 10px; background: #1c1c20; border: 1px solid #34343a; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
    .editor img { width: 100%; max-height: 140px; object-fit: contain; object-position: left top; border-radius: 4px; border: 1px solid #34343a; background: #fff; }
    .editor .shot { height: 64px; border-radius: 4px; background: #232327; }
    .editor .path { font-family: ui-monospace, monospace; font-size: 10px; color: #8f8f98; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .editor textarea { resize: none; width: 100%; padding: 6px 8px; border-radius: 6px; border: 1px solid #34343a; background: #141417; color: #f1f1f4; font: 13px/1.4 ui-sans-serif, system-ui, sans-serif; outline: none; }
    .editor textarea:focus { border-color: #6b6b75; }
    .editor .row { display: flex; justify-content: flex-end; gap: 4px; }
    .editor .row button { padding: 4px 8px; border-radius: 4px; background: transparent; color: #8f8f98; font-size: 11px; }
    .editor .row button:hover { background: #232327; color: #f1f1f4; }
    .editor .row button.add { background: #f1f1f4; color: #141417; font-weight: 500; }
    .editor .row button.add:disabled { opacity: .4; cursor: default; }
    .toast { pointer-events: none; position: fixed; top: 48px; right: 10px; padding: 6px 10px; border-radius: 6px; background: #1c1c20; border: 1px solid #34343a; color: #cfcfd6; font-size: 11px; }
  `;
  root.innerHTML = `<style>${css}</style>
    <div class="pill">
      <span class="where" title=""></span>
      <button class="toggle" aria-pressed="false"><span class="dot"></span>Annotate</button>
      <button class="send" disabled>Send</button>
    </div>
    <div class="layer"></div>`;
  const pill = root.querySelector('.pill');
  const toggleBtn = root.querySelector('.toggle');
  const sendBtn = root.querySelector('.send');
  const where = root.querySelector('.where');
  const layer = root.querySelector('.layer');
  const mount = () => (document.documentElement || document).appendChild(host);
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
    where.textContent = s.project.split('/').slice(-1)[0];
    where.title = s.project;
    sendBtn.textContent = count ? `Send ${count}` : 'Send';
    sendBtn.disabled = !count;
  };

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
    const { top, left } = place(r, 260, 110, 6);
    Object.assign(t.style, { top: `${top}px`, left: `${left}px` });
    return t;
  }

  function editor(r) {
    const e = el(`<div class="editor">
      ${draft.image ? `<img alt="">` : `<div class="shot"></div>`}
      <div class="path"></div>
      <textarea rows="3" placeholder="What is wrong with it?"></textarea>
      <div class="row"><button class="cancel">Cancel</button><button class="add">Add ⌘↩</button></div>
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
    const { top, left } = place(r, 320, 260, 8);
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
    if (dir) toast(`Sent → ${dir.split('/').slice(-2).join('/')}`);
  };

  function toast(msg) {
    const t = el(`<div class="toast"></div>`);
    t.textContent = msg;
    root.appendChild(t);
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
  addEventListener('resize', follow);

  refreshState();
})();
