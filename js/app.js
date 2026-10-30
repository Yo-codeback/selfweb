// 引導式個人頁：封面卡、左側章節進度、章節標題、下一章按鈕、詳情抽屜
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = (n) => String(n).padStart(2, '0');
  const t = (key, fallback) => {
    const v = window.i18n ? window.i18n.t(key) : key;
    return v && v !== key ? v : fallback;
  };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  const stations = $$('[data-station]');

  /* ---------- 封面日期 ---------- */
  const now = new Date();
  $('#tDate').textContent = `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}`;

  /* ---------- 章節標題 / 下一章 / 左側章節 ---------- */
  function renderSigns() {
    stations.forEach((st, i) => {
      const next = stations[i + 1];
      const sign = $('[data-sign]', st);
      if (sign) {
        sign.innerHTML = `<span class="sign-no" aria-hidden="true">${pad2(i + 1)}</span>
          <div class="sign-txt">
            <small>Chapter ${pad2(i + 1)} / ${pad2(stations.length)}</small>
            <h2 id="sign-${st.id}">${esc(st.dataset.zh)}</h2>
            <span class="sign-en">${esc(st.dataset.en)}</span>
          </div>`;
        st.setAttribute('aria-labelledby', `sign-${st.id}`);
      }
      const nb = $('[data-next]', st);
      if (nb) {
        if (!next) { nb.remove(); return; }
        nb.dataset.go = next.id;
        nb.innerHTML = `<span><small>下一章 Next</small><br><b>${esc(next.dataset.zh)}</b> <span class="mono" style="font-size:11px;letter-spacing:.14em">${esc(next.dataset.en)}</span></span>
          <span class="arr" aria-hidden="true"><svg class="ln-ic" viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg></span>`;
      }
    });

    const stops = $('#railStops');
    stops.innerHTML = stations.map((st, i) => {
      const top = stations.length > 1 ? (i / (stations.length - 1)) * 100 : 0;
      return `<li style="top:${top}%"><button type="button" data-go="${st.id}"><span class="dot" aria-hidden="true"></span>
        <span class="lab"><small>${pad2(i + 1)}</small><span data-i18n="${st.dataset.key}">${esc(st.dataset.zh)}</span></span></button></li>`;
    }).join('');
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    const el = document.getElementById(b.dataset.go);
    if (el) el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  });
  $('#backStart').addEventListener('click', () => $('#start').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }));

  /* ---------- 捲動：進度線、目前章節 ---------- */
  const railLine = $('.rail-line'), topbar = $('.topbar'), topCur = $('#topCur');
  let current = -1;
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    railLine.style.setProperty('--p', p.toFixed(4));
    topbar.style.setProperty('--p', p.toFixed(4));
    let idx = 0;
    stations.forEach((st, i) => { if (st.getBoundingClientRect().top <= innerHeight * .45) idx = i; });
    if (idx !== current) {
      current = idx;
      $$('#railStops li').forEach((li, i) => {
        li.classList.toggle('current', i === idx);
        li.classList.toggle('passed', i < idx);
      });
      updateTopCur();
    }
  }
  function updateTopCur() {
    const st = stations[current]; if (!st) return;
    topCur.innerHTML = `<small>${pad2(current + 1)}</small>${esc(t(st.dataset.key, st.dataset.zh))}`;
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- 進場動畫 ---------- */
  function startReveal() {
    if (!('IntersectionObserver' in window)) { $$('.reveal').forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
    $$('.reveal').forEach((el) => io.observe(el));
  }

  /* ---------- 首頁自我介紹：逐字寫出 ---------- */
  const bio = { el: $('#typed'), timer: null, started: false };
  function typeBio(delay) {
    bio.started = true;
    clearTimeout(bio.timer);
    const text = t('hero.bio', '你好，我是一名高中生，熱愛程式開發與數位創作。');
    if (reduced()) { bio.el.textContent = text; return; }
    const chars = Array.from(text);
    let i = 0;
    bio.el.textContent = '';
    const step = () => {
      bio.el.textContent = chars.slice(0, ++i).join('');
      if (i < chars.length) bio.timer = setTimeout(step, /[，,。.]/.test(chars[i - 1]) ? 240 : 50);
    };
    bio.timer = setTimeout(step, delay || 0);
  }

  /* ---------- 開始：封面卡上移 → 入口淡出 ---------- */
  const gate = $('#gate'), ticket = $('#ticket');
  let boarded = false;
  function board() {
    if (boarded) return;
    boarded = true;
    body.classList.add('is-entering');
    scrollTo(0, 0);
    const done = () => {
      body.classList.remove('intro');
      gate.hidden = true;
      startReveal();
      typeBio(300);
      onScroll();
    };
    setTimeout(done, reduced() ? 50 : 900);
  }
  ticket.addEventListener('click', board);
  document.addEventListener('keydown', (e) => {
    if (!boarded && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); board(); }
  });
  ticket.focus({ preventScroll: true });

  /* ---------- 詳情抽屜（獲獎 / 專案；內容讀自 data-*，跟著語言切換） ---------- */
  const drawer = $('#drawer'), drawerContent = $('#drawerContent');
  let lastCard = null;
  const coverHTML = (d) => {
    const cls = d.cover ? ` cover--${d.cover}` : '';
    if (d.cover === 'pvqc') return `<div class="cover${cls}"><span class="cover-mark"><b>PVQC</b><small>AI Literacy</small></span></div>`;
    return d.logo ? `<div class="cover${cls}"><img src="${esc(d.logo)}" alt="" referrerpolicy="no-referrer"${/nantou|w480|weather_master/.test(d.logo) ? ' class="square"' : ''}></div>` : '';
  };
  function openDrawer(card) {
    lastCard = card;
    const d = card.dataset;
    const isAward = card.classList.contains('award-card');
    $('#drawerKind').textContent = isAward ? t('nav.awards', 'Awards') : t('nav.projects', 'Projects');
    const rows = [];
    if (d.date) rows.push(`<dt>${esc(t('ui.date', 'Date'))}</dt><dd>${esc(d.date)}</dd>`);
    if (d.tags) rows.push(`<dt>${esc(t('ui.tags', 'Tags'))}</dt><dd><span class="tags">${d.tags.split(',').map((x) => `<span class="tag">${esc(x.trim())}</span>`).join('')}</span></dd>`);
    if (d.url) rows.push(`<dt>${esc(t('ui.link', 'Link'))}</dt><dd>${esc(d.url)}</dd>`);
    const link = d.href && /^https?:\/\//.test(d.href) ? `<a class="btn" href="${esc(d.href)}" target="_blank" rel="noopener">${esc(t('ui.visit', 'Visit'))} <span aria-hidden="true">↗</span></a>` : '';
    drawerContent.innerHTML = `${coverHTML(d)}
      <div class="drawer-body">
        ${d.badge ? `<span class="stamp">${esc(d.badge)}</span>` : ''}
        <div class="card-org">${esc(d.org || '')}</div>
        <h3 id="drawerTitle">${esc(d.title)}</h3>
        <p class="desc">${esc(d.desc || '')}</p>
        ${rows.length ? `<dl>${rows.join('')}</dl>` : ''}
        ${link}
      </div>`;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    body.style.overflow = 'hidden';
    setTimeout(() => $('#drawerX').focus({ preventScroll: true }), 50);
  }
  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    body.style.overflow = '';
    if (lastCard) lastCard.focus({ preventScroll: true });
  }
  $$('[data-card]').forEach((c) => c.addEventListener('click', () => openDrawer(c)));
  $('#drawerX').addEventListener('click', closeDrawer);
  $('#drawerBd').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (!drawer.classList.contains('open')) return;
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (e.key === 'Tab') {
      const f = $$('button,a[href]', drawer).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- 時鐘 ---------- */
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false });
  const tick = () => { $('#clock').textContent = fmt.format(new Date()); };
  tick(); setInterval(tick, 15000);

  document.addEventListener('langchange', () => {
    updateTopCur();
    if (bio.started) typeBio(0);
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  renderSigns();
  onScroll();
})();
