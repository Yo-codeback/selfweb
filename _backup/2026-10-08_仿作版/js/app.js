// 引導式水平視窗：入口切開動畫、水平捲動 / 拖曳、自訂游標、終端機、詳情視窗
(function () {
  'use strict';

  const SITE = {
    name: 'LXY',
    handle: 'lxy',
    github: 'Yo-codeback',
    timeZone: 'Asia/Taipei',
    enterText: 'click to enter',
    symbols: ['code', 'git-branch', 'cpu', 'hash', 'database', 'brackets-curly', 'globe-simple', 'function'],
    codeCollapsedLines: 14,
    scrollEase: 0.085,
    wheelSpeed: 1.0,
    loaderTimeoutMs: 5000,
  };

  /* ---------- 小工具 ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = (n) => String(n).padStart(2, '0');
  const icon = (name) => `<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
  const tr = (key, fallback) => {
    const v = window.i18n ? window.i18n.t(key) : key;
    return v && v !== key ? v : fallback;
  };
  const root = document.documentElement;
  const body = document.body;
  const mq = {
    reduced: matchMedia('(prefers-reduced-motion: reduce)'),
    fine: matchMedia('(hover: hover) and (pointer: fine)'),
    native: matchMedia('(max-width: 820px), (pointer: coarse)'),
    small: matchMedia('(max-width: 820px)'),
  };
  const reduced = () => mq.reduced.matches;

  const state = {
    entered: false, entering: false, mode: 'virtual',
    target: 0, current: 0, max: 0, W: innerWidth, H: innerHeight,
    wins: [], stops: [], par: [], active: -1, activeWin: -1,
    modalOpen: false, loader: null,
  };

  const stage = $('#stage'), track = $('#track');
  const entry = $('#entry'), enterBtn = $('#enterBtn');
  const bgMedia = $('#bgMedia');

  /* ==================================================================
     A. 動態裝飾
     ================================================================== */
  function decorate() {
    $('#enterText').innerHTML = Array.from(SITE.enterText).map((g, i) => `<span style="--i:${i}">${esc(g)}</span>`).join('');

    const deco = `<i class="e-ring e-ring--2" data-mouse="10"></i><i class="e-ring e-ring--1" data-mouse="5"></i>
      <i class="e-hl e-hl--l"></i><i class="e-hl e-hl--r"></i>
      <i class="e-mark e-mark--tl"></i><i class="e-mark e-mark--tr"></i><i class="e-mark e-mark--bl"></i><i class="e-mark e-mark--br"></i>
      <span class="e-label e-label--tl">${esc(SITE.handle)}</span><span class="e-label e-label--tr">vol.02 — ${new Date().getFullYear()}</span>
      <span class="e-label e-label--bl">index / entry</span><span class="e-label e-label--br">zh / en</span>
      <span class="e-coord">— 0.50 —</span>`;
    $$('.entry-inner').forEach((el) => { el.innerHTML = deco; });

    const gs = Array.from(SITE.name);
    $('#homeName').innerHTML = `<span class="clip">${gs.map((g, i) => `<span class="name-ch${i === gs.length - 1 ? ' acc' : ''}" style="--i:${i}">${esc(g)}</span>`).join('')}</span>`;

    $('#symOrbit').innerHTML = SITE.symbols.map((s, i) => `<span style="--a:${(360 / SITE.symbols.length * i).toFixed(1)}deg"><i${i % 4 === 0 ? ' class="p"' : ''}>${icon(s)}</i></span>`).join('');

    let stars = '';
    for (let i = 0; i < 70; i++) {
      const s = Math.random() < .85 ? 1 : 2;
      stars += `<i style="left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 100).toFixed(2)}%;--s:${s}px;--o:${(.15 + Math.random() * .5).toFixed(2)};--t:${(3 + Math.random() * 6).toFixed(1)}s;--sd:${(-Math.random() * 6).toFixed(1)}s"></i>`;
    }
    $('#bnStars').innerHTML = stars;
    $('#skillsHint').textContent = mq.fine.matches ? 'hover · click for details' : 'tap for details';
  }

  /* ==================================================================
     B. 入口：點擊 → 刀線切開 → 左右分開 → 頭像沿曲線飛到首頁頭像
     ================================================================== */
  function enter() {
    if (state.entered || state.entering) return;
    if (state.loader && !state.loader.ready) { nudgeLoader(); return; }
    state.entering = true;
    enterBtn.disabled = true;
    body.classList.add('is-entering');
    measure();

    if (reduced()) {
      entry.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' });
      body.classList.add('is-handoff', 'is-revealing');
      startObservers();
      setTimeout(finishEntry, 480);
      return;
    }
    const flight = Promise.race([flyAvatar(), new Promise((r) => setTimeout(r, 3500))]);
    setTimeout(() => { body.classList.add('is-revealing'); startObservers(); typeBio(1400); }, 820);
    Promise.all([flight, new Promise((r) => setTimeout(r, 2180))]).then(finishEntry);
  }

  function finishEntry() {
    state.entering = false; state.entered = true;
    body.classList.add('is-entered', 'is-handoff', 'is-revealing');
    $$('.av--fly').forEach((x) => x.remove());
    entry.setAttribute('hidden', '');
    entry.setAttribute('aria-hidden', 'true');
    stage.focus({ preventScroll: true });
    if (!bio.started) typeBio(0);
    measure();
  }

  /* FLIP：飛行元素放在首頁頭像的最終位置，用 transform 從入口小頭像沿三次貝茲曲線飛過去 */
  function flyAvatar() {
    return new Promise((resolve) => {
      const srcAv = $('#entryAv');
      const dst = $('#heroAvatar');
      const a = srcAv.getBoundingClientRect();
      const b = dst.getBoundingClientRect();
      if (!a.width || !b.width || typeof Element.prototype.animate !== 'function') {
        body.classList.add('is-handoff'); resolve(); return;
      }
      const W = innerWidth, H = innerHeight;
      const p0 = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
      const p3 = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      const p1 = { x: clamp(p0.x - W * 0.27, W * .12, W * .88), y: clamp(p0.y + H * 0.07, H * .1, H * .92) };
      const p2 = { x: clamp(p3.x - W * 0.22, W * .1, W * .9), y: clamp(p3.y - H * 0.34, H * .06, H * .9) };
      const bez = (t, k) => { const u = 1 - t; return u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]; };
      const s0 = a.width / b.width;
      const N = 36, frames = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const dx = bez(t, 'x') - p3.x, dy = bez(t, 'y') - p3.y;
        const grow = t < .84 ? lerp(s0, 1.06, 1 - Math.pow(1 - t / .84, 2.2)) : lerp(1.06, 1, (t - .84) / .16);
        const rot = -13 * Math.sin(Math.PI * t) * (1 - t * .55);
        const blur = Math.pow(1 - t, .8) * (1.2 + 3.4 * Math.sin(Math.PI * t));
        const glow = Math.sin(Math.PI * Math.min(1, t * 1.1));
        frames.push({
          offset: t,
          transform: i === N ? 'translate(0px, 0px) rotate(0deg) scale(1)' : `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${grow.toFixed(4)})`,
          filter: i === N ? 'blur(0px) drop-shadow(0px 0px 0px rgba(77,141,255,0))' : `blur(${blur.toFixed(2)}px) drop-shadow(0px 0px ${(28 * glow).toFixed(1)}px rgba(77,141,255,${(.9 * glow).toFixed(2)}))`,
          opacity: i === N ? 1 : Math.min(1, .55 + t * 1.6),
        });
      }
      const opts = { duration: 1880, easing: 'cubic-bezier(.58,.02,.18,1)', fill: 'forwards' };
      const makeFly = (cls) => {
        const f = dst.cloneNode(true);
        f.removeAttribute('id');
        f.classList.add('av--fly'); if (cls) f.classList.add(cls);
        Object.assign(f.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px', margin: '0', opacity: '0' });
        document.body.appendChild(f);
        return f;
      };
      for (let g = 1; g <= 4; g++) {
        const ghost = makeFly('av--ghost');
        const gf = frames.map((k, i) => ({ ...k, opacity: i === N ? 0 : k.opacity * (.2 - g * .035), filter: `blur(${4 + g * 2}px)` }));
        ghost.animate(gf, { ...opts, delay: g * 55 }).onfinish = () => ghost.remove();
      }
      const fly = makeFly();
      srcAv.style.visibility = 'hidden';
      fly.animate(frames, opts).onfinish = () => {
        body.classList.add('is-handoff');
        requestAnimationFrame(() => requestAnimationFrame(() => { fly.remove(); resolve(); }));
      };
    });
  }

  entry.addEventListener('click', enter);
  document.addEventListener('keydown', (e) => {
    if (!state.entered && !state.entering && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) { e.preventDefault(); enter(); }
  });

  /* ---------- 首頁自我介紹：打字機 ---------- */
  const bio = { el: $('#typed'), timer: null, started: false };
  function typeBio(delay) {
    bio.started = true;
    clearTimeout(bio.timer);
    const text = tr('hero.bio', '你好，我是一名高中生，熱愛程式開發與數位創作。');
    if (reduced()) { bio.el.textContent = text; return; }
    const chars = Array.from(text);
    let i = 0;
    bio.el.textContent = '';
    const step = () => {
      bio.el.textContent = chars.slice(0, ++i).join('');
      if (i < chars.length) bio.timer = setTimeout(step, chars[i - 1] === '，' || chars[i - 1] === ',' ? 220 : 55);
    };
    bio.timer = setTimeout(step, delay || 0);
  }

  /* ==================================================================
     C. 水平畫布：量測、捲動、拖曳、鍵盤、導覽
     ================================================================== */
  const navWins = $$('.win[data-nav]');
  function buildNav() {
    $('#navTotal').textContent = pad2(navWins.length);
    $('#navDots').innerHTML = navWins.map((w, i) => `<li><button type="button" data-go="${i}" aria-label="go to ${esc(w.dataset.label)}"><span>${pad2(i + 1)} ${esc(w.dataset.label)}</span></button></li>`).join('');
    $$('#navDots button').forEach((b) => b.addEventListener('click', () => goToWin(navWins[+b.dataset.go])));
  }

  function setMode() {
    const m = mq.native.matches ? 'native' : 'virtual';
    if (m === state.mode && root.classList.contains('is-' + m)) return;
    const prev = state.current;
    state.mode = m;
    root.classList.toggle('is-native', m === 'native');
    root.classList.toggle('is-virtual', m === 'virtual');
    if (m === 'native') { track.style.transform = ''; stage.scrollLeft = prev; }
    else { stage.scrollLeft = 0; state.target = state.current = prev; }
  }

  function measure() {
    state.W = innerWidth; state.H = innerHeight;
    state.wins = $$('.win').map((el) => ({ el, left: el.offsetLeft, width: el.offsetWidth }));
    state.max = Math.max(0, track.scrollWidth - (state.mode === 'native' ? stage.clientWidth : state.W));
    state.stops = state.wins.map((w) => clamp(w.width < state.W ? w.left - (state.W - w.width) / 2 : w.left - (w.el.classList.contains('win--home') || w.el.classList.contains('win--banner') || w.el.classList.contains('win--end') ? 0 : Math.min(state.W * .07, 110)), 0, state.max));
    state.par = $$('[data-mouse]').map((el) => ({ el, mouse: +(el.dataset.mouse || 0) }));
    state.target = clamp(state.target, 0, state.max);
  }

  function nearestStop(pos) {
    let best = 0, bd = Infinity;
    state.stops.forEach((s, i) => { const d = Math.abs(s - pos); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function scrollToPos(pos) {
    pos = clamp(pos, 0, state.max);
    if (state.mode === 'native') stage.scrollTo({ left: pos, behavior: reduced() ? 'auto' : 'smooth' });
    else state.target = pos;
  }
  function goToWin(el) { const i = state.wins.findIndex((w) => w.el === el); if (i >= 0) scrollToPos(state.stops[i]); }
  function goStep(dir) {
    const pos = state.mode === 'native' ? stage.scrollLeft : state.target;
    let idx = -1;
    if (dir > 0) idx = state.stops.findIndex((s) => s > pos + 4);
    else for (let i = state.stops.length - 1; i >= 0; i--) if (state.stops[i] < pos - 4) { idx = i; break; }
    if (idx >= 0) scrollToPos(state.stops[idx]);
  }

  /* 內部可垂直捲動的元素（終端機、展開的程式碼、手機視窗）優先自己捲 */
  function canScrollInside(t, dy) {
    for (let el = t; el && el !== stage && el !== body; el = el.parentElement) {
      if (el.scrollHeight > el.clientHeight + 1) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && ((dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) || (dy < 0 && el.scrollTop > 0))) return true;
      }
    }
    return false;
  }

  addEventListener('wheel', (e) => {
    if (!state.entered) { e.preventDefault(); return; }
    if (state.modalOpen) return;
    const horiz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    let d = horiz ? e.deltaX : e.deltaY;
    if (!horiz && canScrollInside(e.target, e.deltaY)) return;
    if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= state.W;
    if (state.mode === 'native') { if (horiz) return; e.preventDefault(); stage.scrollLeft += d; return; }
    e.preventDefault();
    state.target = clamp(state.target + d * SITE.wheelSpeed, 0, state.max);
  }, { passive: false });

  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (state.mode !== 'virtual' || !state.entered || state.modalOpen || e.button !== 0) return;
    if (e.target.closest('a,input,textarea,select,label,.term-out,.code-body')) return;
    drag = { id: e.pointerId, x: e.clientX, t: state.target, lx: e.clientX, lt: performance.now(), v: 0, moved: false };
  });
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; body.classList.add('is-dragging'); hideTip(); try { stage.setPointerCapture(e.pointerId); } catch (_) {} }
    if (!drag.moved) return;
    const now = performance.now(), dt = Math.max(1, now - drag.lt);
    drag.v = lerp(drag.v, (e.clientX - drag.lx) / dt, .35);
    drag.lx = e.clientX; drag.lt = now;
    state.target = clamp(drag.t - dx * 1.2, 0, state.max);
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.moved) {
      state.target = clamp(state.target - drag.v * 260, 0, state.max);
      const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      addEventListener('click', kill, { capture: true, once: true });
      setTimeout(() => removeEventListener('click', kill, { capture: true }), 60);
    }
    body.classList.remove('is-dragging');
    drag = null;
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  addEventListener('keydown', (e) => {
    if (!state.entered) return;
    if (state.modalOpen) { modalKeys(e); return; }
    if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'Escape') { hideTip(); return; }
    const map = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 };
    if (map[e.key]) { e.preventDefault(); goStep(map[e.key]); }
    else if (e.key === 'Home') { e.preventDefault(); scrollToPos(0); }
    else if (e.key === 'End') { e.preventDefault(); scrollToPos(state.max); }
  });

  $('#backStart').addEventListener('click', () => scrollToPos(0));

  /* ==================================================================
     D. 每一幀：平滑捲動、背景視差、導覽狀態、游標
     ================================================================== */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const curDot = $('#curDot'), trailCv = $('#curTrail');
  const cur = { on: false, x: -999, y: -999, lastKey: '' };
  let lastKey = '', lastT = performance.now();
  function frame(now) {
    now = now || performance.now();
    const dtF = clamp((now - lastT) / 16.667, .25, 4);
    lastT = now;
    const ease = (k) => 1 - Math.pow(1 - k, dtF);
    if (state.mode === 'virtual') {
      const d = state.target - state.current;
      state.current = Math.abs(d) < .05 ? state.target : state.current + d * ease(drag && drag.moved ? .22 : (reduced() ? .3 : SITE.scrollEase));
      track.style.transform = `translate3d(${(-state.current).toFixed(2)}px,0,0)`;
    } else {
      state.current = stage.scrollLeft;
    }
    const k = reduced() ? 1 : ease(.07);
    mouse.x = lerp(mouse.x, mouse.tx, k); mouse.y = lerp(mouse.y, mouse.ty, k);
    const key = state.current.toFixed(1) + '|' + mouse.x.toFixed(3) + '|' + mouse.y.toFixed(3);
    if (key !== lastKey) { lastKey = key; updateScene(); }
    if (cur.on) {
      const ck = cur.x + '|' + cur.y + '|' + state.current.toFixed(0) + '|' + state.modalOpen;
      if (ck !== cur.lastKey) { cur.lastKey = ck; curProbe(); }
    }
    requestAnimationFrame(frame);
  }

  function updateScene() {
    const c = state.current, W = state.W;
    const p = state.max ? c / state.max : 0;
    $('#navBar').style.transform = `scaleX(${p.toFixed(4)})`;
    if (!reduced()) {
      bgMedia.style.transform = `translate3d(${(-p * 2.6 + mouse.x * -.5).toFixed(3)}%, ${(mouse.y * -.5).toFixed(3)}%, 0)`;
      for (const it of state.par) it.el.style.translate = `${(mouse.x * it.mouse).toFixed(2)}px ${(mouse.y * it.mouse).toFixed(2)}px`;
    }
    const center = c + W / 2;
    let ai = 0, bd = Infinity;
    state.wins.forEach((w, i) => {
      const d = center < w.left ? w.left - center : center > w.left + w.width ? center - w.left - w.width : 0;
      if (d < bd) { bd = d; ai = i; }
    });
    if (ai !== state.activeWin) {
      state.activeWin = ai;
      const w = state.wins[ai];
      body.classList.toggle('on-dark', !!w && w.el.classList.contains('win--banner'));
    }
    let navI = 0, nd = Infinity;
    navWins.forEach((el, i) => {
      const w = state.wins.find((x) => x.el === el); if (!w) return;
      const d = Math.abs(w.left + w.width / 2 - center);
      if (d < nd) { nd = d; navI = i; }
    });
    if (navI !== state.active) {
      state.active = navI;
      $('#navCur').textContent = pad2(navI + 1);
      $('#navLab').textContent = navWins[navI].dataset.label;
      $$('#navDots button').forEach((b, i) => b.setAttribute('aria-current', String(i === navI)));
    }
  }

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse.tx = (e.clientX / state.W) * 2 - 1; mouse.ty = (e.clientY / state.H) * 2 - 1;
  }, { passive: true });

  /* ---------- 自訂游標 + 軌跡 ---------- */
  const curAllowed = () => mq.fine.matches && !reduced();
  const CUR_HOVER = 'a,button,[role="button"],label,.chip,.work,.int-tag,.av--hero,.entry-btn,[data-cursor="hover"]';
  const CUR_TEXT = 'input[type="text"],input:not([type]),textarea,[contenteditable="true"]';
  function curProbe() {
    const el = document.elementFromPoint(cur.x, cur.y);
    root.classList.toggle('cur-text', !!(el && el.closest(CUR_TEXT)));
    root.classList.toggle('cur-hover', !!(el && el.closest(CUR_HOVER)) && !body.classList.contains('is-dragging'));
    root.classList.toggle('cur-dark', !state.modalOpen && !!(el && el.closest('.win--banner')));
  }

  const trail = { pts: [], raf: 0, dpr: 1, w: 0, h: 0, lx: null, ly: null, lt: 0, LIFE: 330, STEP: 2.5, R: 6, MAX: 700 };
  const tctx = trailCv.getContext('2d');
  const sprite = (() => {
    const c = document.createElement('canvas'), S = 96; c.width = c.height = S;
    const g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(190,215,255,1)');
    gr.addColorStop(.3, 'rgba(127,176,255,1)');
    gr.addColorStop(.62, 'rgba(77,141,255,.6)');
    gr.addColorStop(1, 'rgba(77,141,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S);
    return c;
  })();
  function trailResize() {
    trail.dpr = Math.min(2, devicePixelRatio || 1);
    trail.w = innerWidth; trail.h = innerHeight;
    trailCv.width = Math.round(trail.w * trail.dpr); trailCv.height = Math.round(trail.h * trail.dpr);
    tctx.setTransform(trail.dpr, 0, 0, trail.dpr, 0, 0);
  }
  trailResize();
  addEventListener('resize', trailResize, { passive: true });
  function trailAdd(x, y, t) {
    if (trail.lx === null) { trail.lx = x; trail.ly = y; trail.lt = t; }
    const dx = x - trail.lx, dy = y - trail.ly, d = Math.hypot(dx, dy);
    const n = Math.min(60, Math.floor(d / trail.STEP));
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      trail.pts.push({ x: trail.lx + dx * f, y: trail.ly + dy * f, t: trail.lt + (t - trail.lt) * f });
    }
    if (n > 0 || d === 0) { trail.lx = x; trail.ly = y; trail.lt = t; }
    if (trail.pts.length > trail.MAX) trail.pts.splice(0, trail.pts.length - trail.MAX);
    if (!trail.raf) trail.raf = requestAnimationFrame(trailDraw);
  }
  function trailDraw() {
    const now = performance.now(), P = trail.pts;
    tctx.clearRect(0, 0, trail.w, trail.h);
    let i = 0;
    while (i < P.length && now - P[i].t >= trail.LIFE) i++;
    if (i) P.splice(0, i);
    if (!P.length) { trail.raf = 0; return; }
    const dark = root.classList.contains('cur-dark');
    tctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    const base = dark ? .19 : .17;
    for (let k = 0; k < P.length; k++) {
      const p = P[k], s = 1 - (now - p.t) / trail.LIFE;
      const r = trail.R * (.18 + .82 * Math.pow(s, .85));
      tctx.globalAlpha = base * Math.pow(s, 1.6);
      tctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2);
    }
    tctx.globalAlpha = 1; tctx.globalCompositeOperation = 'source-over';
    trail.raf = requestAnimationFrame(trailDraw);
  }
  function trailReset() { trail.pts.length = 0; trail.lx = null; }
  function curOff() {
    cur.on = false; trailReset();
    root.classList.remove('has-cur', 'cur-hover', 'cur-down', 'cur-dark', 'cur-text', 'cur-out');
  }
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!curAllowed()) { if (cur.on) curOff(); return; }
    cur.x = e.clientX; cur.y = e.clientY;
    curDot.style.transform = `translate3d(${cur.x}px,${cur.y}px,0)`;
    if (!cur.on || root.classList.contains('cur-out')) {
      trailReset();
      cur.on = true;
      curProbe();
      root.classList.add('has-cur');
      root.classList.remove('cur-out');
    }
    if (root.classList.contains('cur-text')) { trail.lx = null; return; }
    const now = performance.now();
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    if (list && list.length > 1) list.forEach((c, k) => trailAdd(c.clientX, c.clientY, now - (list.length - 1 - k) * 2));
    else trailAdd(cur.x, cur.y, now);
  }, { passive: true });
  addEventListener('pointerdown', (e) => { if (cur.on && e.pointerType === 'mouse') root.classList.add('cur-down'); }, { passive: true });
  addEventListener('pointerup', () => { root.classList.remove('cur-down'); cur.lastKey = ''; }, { passive: true });
  addEventListener('pointercancel', () => root.classList.remove('cur-down'), { passive: true });
  const curLeave = () => { root.classList.add('cur-out'); trailReset(); };
  document.addEventListener('mouseleave', curLeave);
  document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) curLeave(); });
  addEventListener('blur', curLeave);
  const curMq = () => { if (!curAllowed()) curOff(); };
  mq.fine.addEventListener('change', curMq);
  mq.reduced.addEventListener('change', curMq);

  /* 視窗 hover：輕微 3D 傾斜 */
  function setupTilt() {
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (!mq.fine.matches || reduced() || !state.entered || drag) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(1200px) rotateX(${(-py * 2.4).toFixed(2)}deg) rotateY(${(px * 2.8).toFixed(2)}deg) translate3d(0,-3px,0)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ==================================================================
     E. 進場觀察
     ================================================================== */
  let io = null;
  function startObservers() {
    if (io) return;
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach((el) => el.classList.add('is-in')); return; }
    io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { root: null, rootMargin: '0px -4% 0px -4%', threshold: 0.12 });
    $$('.reveal').forEach((el) => io.observe(el));
  }

  /* ==================================================================
     F. 程式碼視窗 / 終端機
     ================================================================== */
  function highlight(line) {
    const re = /(\/\/.*$|\/\*.*?(?:\*\/|$)|^\s*\*(?:\/|\s.*)?$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|export|default|import|from|new|if|else|interface|type|readonly|as|satisfies)\b|\b(string|number|boolean|void|null|undefined|true|false)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\??\s*:(?!:))|\b([A-Z][A-Za-z0-9]*)\b|([a-z_$][\w$]*)(?=\s*[(<](?!\s*=))/g;
    let out = '', last = 0, m;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index));
      const cls = m[1] ? 'c-com' : m[2] ? 'c-str' : m[3] ? 'c-kw' : m[4] ? 'c-ty' : m[5] ? 'c-num' : m[6] ? 'c-key' : m[7] ? 'c-ty' : 'c-fn';
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
      if (!m[0].length) re.lastIndex++;
    }
    return out + esc(line.slice(last));
  }
  function renderCode() {
    const snippet = `/** LXY — public profile rendered by this site. */
export interface Profile {
  readonly handle: string;
  readonly age: number;
  readonly from: string;
  readonly base: string;
  readonly stack: readonly string[];
}

export const profile = {
  handle: "LXY",
  age: ${window.LXY_AGE || 15},
  from: "Taitung, Taiwan",
  base: "Nantou, Taiwan",
  school: "vocational hs / mechanical",
  stack: ["python", "web", "design", "photography", "translation"],
  likes: ["minecraft", "hardware", "computers"],
  github: "${SITE.github}",
  contact: ["contact@lxyo.cc.cd", "me@lxyo.cc.cd"],
} as const satisfies Profile;

/** Say hello in the visitor's language. */
export function hello(lang: "zh" | "en" = "zh"): string {
  return lang === "zh" ? "你好，我是 LXY。" : "hi, i'm LXY.";
}`;
    const lines = snippet.split('\n');
    $('#codeLinesCount').textContent = `${lines.length} lines`;
    $('#codeLines').innerHTML = lines.map((l, i) => `<li><span class="lc">${highlight(l)}${i === lines.length - 1 ? '<span class="cursor" aria-hidden="true"></span>' : ''}</span></li>`).join('');
    const lh = mq.small.matches ? 20 : 22;
    const win = $('#codeWin');
    win.style.setProperty('--collapsed', `${SITE.codeCollapsedLines * lh + 16}px`);
    const toggle = $('#codeToggle');
    toggle.addEventListener('click', () => {
      const full = $('#codeLines').scrollHeight;
      const maxH = Math.max(200, state.H * (mq.small.matches ? .7 : .62));
      win.style.setProperty('--full', `${Math.min(full, maxH)}px`);
      const on = !win.classList.contains('is-expanded');
      win.classList.toggle('is-expanded', on);
      toggle.setAttribute('aria-expanded', String(on));
      toggle.querySelector('span').textContent = on ? 'collapse' : 'expand';
    });
  }

  const termOut = $('#termOut'), termInput = $('#termInput');
  const history = []; let hIdx = 0;
  const cards = () => $$('.work[data-card]');
  function termPrint(cmd, res) {
    if (cmd !== null) termOut.insertAdjacentHTML('beforeend', `<div class="t-cmd">${esc(cmd)}</div>`);
    if (res) termOut.insertAdjacentHTML('beforeend', `<div class="t-res">${esc(res)}</div>`);
    termOut.scrollTop = termOut.scrollHeight;
  }
  const commands = {
    help: () => 'commands: help · whoami · about · skills · awards · projects · open <n> · contact · lang <zh|en> · goto <name> · clear',
    whoami: () => `${SITE.name} (@${SITE.github})\n${tr('hero.role', 'student')}\n${tr('hero.bio', '')}`,
    about: () => [
      `${tr('about.birthplaceLabel', 'birthplace')}: ${tr('about.birthplace', '')}`,
      `${tr('about.residenceLabel', 'residence')}: ${tr('about.residence', '')}`,
      `${tr('about.ageLabel', 'age')}: ${window.LXY_AGE}`,
      `${tr('about.educationLabel', 'education')}: ${tr('about.education', '')}`,
    ].join('\n'),
    skills: () => $$('.chip[data-card]').map((c) => `· ${c.dataset.title.toLowerCase().padEnd(13, ' ')} ${c.dataset.tags.split(',').join(' · ')}`).join('\n') + '\n→ click a chip below for details',
    awards: () => cards().map((c, i) => ({ c, i })).filter((x) => x.c.classList.contains('award-card')).map(({ c, i }) => `${pad2(i + 1)}  ${c.dataset.title} — ${c.dataset.badge}`).join('\n') + '\n→ type “open 1” to view one',
    projects: () => cards().map((c, i) => ({ c, i })).filter((x) => !x.c.classList.contains('award-card')).map(({ c, i }) => `${pad2(i + 1)}  ${c.dataset.title}`).join('\n') + '\n→ type “open 4” to view one',
    open: (arg) => {
      const list = cards(), n = parseInt(arg, 10);
      if (!list[n - 1]) return `usage: open <1-${list.length}>`;
      setTimeout(() => openDetail(list[n - 1]), 250);
      return `opening ${list[n - 1].dataset.title} …`;
    },
    contact: () => 'email     contact@lxyo.cc.cd\nemail     me@lxyo.cc.cd\ngithub    github.com/Yo-codeback\nstatus    status.ddns.ge',
    lang: (arg) => {
      const l = (arg || '').toLowerCase();
      if (l !== 'zh' && l !== 'en') return 'usage: lang <zh|en>';
      window.i18n && window.i18n.setLang(l);
      return `language → ${l}`;
    },
    goto: (arg) => {
      const el = navWins.find((w) => w.dataset.label === (arg || '').toLowerCase());
      if (!el) return `usage: goto <${navWins.map((w) => w.dataset.label).join('|')}>`;
      goToWin(el); return `→ ${el.dataset.label}`;
    },
    uname: () => 'lxy.sys 2.0 — x86_64 — built by hand',
    sudo: () => 'lxy is not in the sudoers file. this incident will be reported.',
    ls: () => 'about/  experience/  awards/  projects/  skills/  contact.md',
  };
  function runCmd(raw) {
    const input = raw.trim(); if (!input) return;
    history.push(input); hIdx = history.length;
    const [name, ...args] = input.split(/\s+/);
    if (name.toLowerCase() === 'clear') { termOut.innerHTML = ''; return; }
    const fn = commands[name.toLowerCase()];
    termPrint(input, fn ? fn(args.join(' ')) : `command not found: ${name} — try “help”`);
  }
  $('#termForm').addEventListener('submit', (e) => { e.preventDefault(); runCmd(termInput.value); termInput.value = ''; });
  termInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) { e.preventDefault(); hIdx = Math.max(0, hIdx - 1); termInput.value = history[hIdx]; }
    if (e.key === 'ArrowDown' && history.length) { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); termInput.value = history[hIdx] || ''; }
  });
  termPrint(null, 'lxy — tty01\ntype “help” to begin.');

  /* ==================================================================
     G. 技能 tooltip
     ================================================================== */
  const tip = $('#tip');
  const tagsHTML = (s) => (s ? `<span class="tags">${s.split(',').map((t) => `<span class="tag">${esc(t.trim())}</span>`).join('')}</span>` : '');
  function showTip(ch) {
    if (drag && drag.moved) return;
    $$('.chip.is-on').forEach((c) => c.classList.remove('is-on'));
    ch.classList.add('is-on');
    const d = ch.dataset;
    tip.innerHTML = `<h4>${esc(d.icon || '')} ${esc(d.title)}</h4><p>${esc(d.desc || '')}</p>${tagsHTML(d.tags)}<p class="tip-hint">click for details</p>`;
    const r = ch.getBoundingClientRect();
    tip.classList.add('is-on');
    const th = tip.offsetHeight, tw = tip.offsetWidth;
    let top = r.top - th - 12; if (top < 12) top = r.bottom + 12;
    const left = clamp(r.left + r.width / 2 - tw / 2, 12, state.W - tw - 12);
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hideTip() { tip.classList.remove('is-on'); $$('.chip.is-on').forEach((c) => c.classList.remove('is-on')); }
  addEventListener('wheel', hideTip, { passive: true });
  $$('.chip[data-card]').forEach((ch) => {
    ch.addEventListener('mouseenter', () => showTip(ch));
    ch.addEventListener('focus', () => { if (ch.matches(':focus-visible')) showTip(ch); });
    ch.addEventListener('mouseleave', hideTip);
    ch.addEventListener('blur', hideTip);
  });

  /* ==================================================================
     H. 詳情視窗（獲獎 / 專案 / 技能共用；內容讀自元素的 data-*，會跟著語言切換）
     ================================================================== */
  const modal = $('#modal'), modalWin = $('#modalWin');
  let lastCard = null, modalAnim = null;
  const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'detail';

  function openDetail(el) {
    if (!el || state.modalOpen) return;
    hideTip();
    lastCard = el;
    const d = el.dataset;
    const isAward = el.classList.contains('award-card');
    const isSkill = el.classList.contains('chip');
    const kind = isAward ? 'awards' : isSkill ? 'stack' : 'projects';
    const pat = (el.querySelector('.pat') || {}).className || 'pat pat-2';
    $('#modalFile').textContent = `${kind}/${slug(d.previewKey || d.title)}.md`;
    $('#modalCat').textContent = kind;
    const cover = d.img
      ? `<img alt="" data-shot referrerpolicy="no-referrer"><span class="glyph" aria-hidden="true">${esc(d.icon || '')}</span>`
      : `<span class="${esc(pat)}"></span><span class="glyph" aria-hidden="true">${esc(d.icon || '')}</span>`;
    const rows = [];
    if (d.date) rows.push(`<dt>date</dt><dd>${esc(d.date)}</dd>`);
    if (d.tags) rows.push(`<dt>tags</dt><dd>${tagsHTML(d.tags)}</dd>`);
    if (d.url) rows.push(`<dt>link</dt><dd>${esc(d.url)}</dd>`);
    const link = d.href && /^https?:\/\//.test(d.href) ? `<a class="btn-line" href="${esc(d.href)}" target="_blank" rel="noopener">visit <span aria-hidden="true">↗</span></a>` : '';
    $('#modalGrid').innerHTML = `<div class="modal-cover">${cover}</div>
      <div class="modal-body"><p class="k">${esc(d.org || kind)}</p><h3 id="modalTitle">${esc(d.title)}</h3>
        ${d.badge ? `<p class="sub"><span class="badge">${esc(d.badge)}</span></p>` : ''}
        <p class="desc">${esc(d.desc || '')}</p>
        ${rows.length ? `<dl>${rows.join('')}</dl>` : ''}
        ${link}</div>`;
    const shot = $('#modalGrid img[data-shot]');
    if (shot) {
      shot.onerror = () => { const c = shot.parentNode; shot.remove(); c.insertAdjacentHTML('afterbegin', `<span class="${esc(pat)}"></span>`); };
      shot.src = d.img;
    }
    modal.hidden = false; state.modalOpen = true; body.classList.add('modal-open');

    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      const l = modalWin.getBoundingClientRect();
      const src = lastCard.querySelector('.work-card') || lastCard;
      const f = src.getBoundingClientRect();
      if (modalAnim) modalAnim.cancel();
      if (!reduced() && f.width && f.right > 0 && f.left < state.W) {
        modalAnim = modalWin.animate([
          { transform: `translate(${f.left - l.left}px, ${f.top - l.top}px) scale(${f.width / l.width}, ${f.height / l.height})`, opacity: .4 },
          { transform: 'none', opacity: 1 }], { duration: 820, easing: 'cubic-bezier(.22,1,.36,1)' });
      } else if (!reduced()) {
        modalAnim = modalWin.animate([{ transform: 'translateY(24px) scale(.97)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
      $('#modalX').focus({ preventScroll: true });
    });
  }
  function closeModal() {
    if (!state.modalOpen) return;
    modal.classList.remove('is-open');
    const done = () => { modal.hidden = true; state.modalOpen = false; body.classList.remove('modal-open'); if (lastCard) lastCard.focus({ preventScroll: true }); };
    const l = modalWin.getBoundingClientRect();
    const src = lastCard && (lastCard.querySelector('.work-card') || lastCard);
    const f = src && src.getBoundingClientRect();
    if (modalAnim) modalAnim.cancel();
    if (!reduced() && f && f.width && f.right > 0 && f.left < state.W) {
      modalAnim = modalWin.animate([{ transform: 'none', opacity: 1 },
        { transform: `translate(${f.left - l.left}px, ${f.top - l.top}px) scale(${f.width / l.width}, ${f.height / l.height})`, opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.64,0,.3,1)' });
      modalAnim.onfinish = done;
    } else done();
  }
  function modalKeys(e) {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key === 'Tab') {
      const f = $$('button,a[href]', modalWin).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  $$('[data-card]').forEach((el) => el.addEventListener('click', () => openDetail(el)));
  $('#modalX').addEventListener('click', closeModal);
  $('#modalBd').addEventListener('click', closeModal);

  /* 卡片封面圖（例如 Google Play 截圖）：載入成功才蓋過生成式封面 */
  $$('.work[data-img]').forEach((card) => {
    const coverEl = card.querySelector('.work-cover');
    const im = new Image();
    im.alt = ''; im.decoding = 'async'; im.referrerPolicy = 'no-referrer';
    im.onload = () => { coverEl.insertBefore(im, coverEl.querySelector('.glyph')); requestAnimationFrame(() => coverEl.classList.add('has-img')); };
    im.src = card.dataset.img;
  });

  /* ==================================================================
     I. 入口載入進度（字型 + 翻譯；逾時一定完成）
     ================================================================== */
  const loadFill = $('#entryLoadFill'), loadTxt = $('#entryLoadTxt'), loadBox = $('#entryLoad');
  function nudgeLoader() {
    loadBox.classList.add('is-nudge');
    clearTimeout(nudgeLoader.t); nudgeLoader.t = setTimeout(() => loadBox.classList.remove('is-nudge'), 700);
  }
  function setupLoader() {
    const L = state.loader = { ready: false, progress: 0 };
    const t0 = performance.now();
    let fontsDone = !document.fonts;
    if (document.fonts) document.fonts.ready.then(() => { fontsDone = true; }, () => { fontsDone = true; });
    const i18nDone = () => !window.i18n || window.i18n.ready();
    body.classList.add('is-loading');
    enterBtn.setAttribute('aria-busy', 'true');
    const finish = () => {
      if (L.ready) return;
      L.ready = true; L.progress = 1;
      loadFill.style.transform = 'scaleX(1)';
      loadTxt.textContent = 'ready';
      body.classList.remove('is-loading'); body.classList.add('is-loaded');
      enterBtn.removeAttribute('aria-busy');
      clearInterval(L.iv); clearTimeout(L.to);
      measure();
    };
    const tick = () => {
      const time = Math.min(1, (performance.now() - t0) / 900);
      const p = (fontsDone ? .4 : 0) + (i18nDone() ? .4 : 0) + .2 * time;
      L.progress = Math.max(L.progress, p);
      loadFill.style.transform = `scaleX(${L.progress.toFixed(3)})`;
      loadTxt.textContent = `loading ${String(Math.floor(L.progress * 100)).padStart(2, '0')}%`;
      if (fontsDone && i18nDone() && time >= 1) finish();
    };
    L.iv = setInterval(tick, 100);
    L.to = setTimeout(finish, SITE.loaderTimeoutMs);
    tick();
  }

  /* 時鐘 */
  const clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: SITE.timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tickClock = () => { $('#clock').textContent = clockFmt.format(new Date()); };

  /* 語言切換後：重新量測寬度、重打自我介紹 */
  document.addEventListener('langchange', () => {
    requestAnimationFrame(() => { measure(); lastKey = ''; });
    if (bio.started) typeBio(0);
  });

  let rz = null;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => {
      const keep = state.wins.length ? nearestStop(state.current) : 0;
      setMode();
      measure();
      const pos = state.stops[keep] || 0;
      if (state.mode === 'virtual') { state.target = state.current = pos; } else stage.scrollLeft = pos;
      lastKey = '';
      hideTip();
    }, 140);
  });

  /* ==================================================================
     啟動
     ================================================================== */
  decorate();
  renderCode();
  buildNav();
  setMode();
  stage.scrollLeft = 0;
  measure();
  setupLoader();
  setupTilt();
  tickClock(); setInterval(tickClock, 1000);
  requestAnimationFrame(frame);
  const ready = () => body.classList.add('is-ready');
  const rt = setTimeout(ready, 1200);
  if (document.fonts) document.fonts.ready.then(() => { clearTimeout(rt); setTimeout(ready, 60); measure(); });
  enterBtn.focus({ preventScroll: true });
})();
