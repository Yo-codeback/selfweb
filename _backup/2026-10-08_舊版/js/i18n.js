// 中英文切換（翻譯來源：data/i18n.xml）
(function () {
  const STRINGS = { zh: {}, en: {} };
  const PREVIEWS = { zh: {}, en: {} };
  let ready = false;

  function detectLang() {
    const saved = localStorage.getItem('lang');
    if (saved === 'zh' || saved === 'en') return saved;
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  }

  let lang = detectLang();

  function parseStrings(doc) {
    doc.querySelectorAll('strings > string').forEach(el => {
      const key = el.getAttribute('key');
      const isHtml = el.getAttribute('html') === 'true';
      el.querySelectorAll('zh, en').forEach(langEl => {
        const code = langEl.tagName.toLowerCase();
        STRINGS[code][key] = isHtml ? langEl.innerHTML.trim() : langEl.textContent.trim();
      });
    });
  }

  function parseLangBlock(langEl) {
    const data = {};
    langEl.childNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      data[node.tagName.toLowerCase()] = node.textContent.trim();
    });
    return data;
  }

  function parsePreviews(doc) {
    doc.querySelectorAll('previews > preview').forEach(el => {
      const key = el.getAttribute('key');
      el.querySelectorAll('zh, en').forEach(langEl => {
        const code = langEl.tagName.toLowerCase();
        PREVIEWS[code][key] = parseLangBlock(langEl);
      });
    });
  }

  function parseXml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('i18n.xml parse error');
    }
    parseStrings(doc);
    parsePreviews(doc);
  }

  function t(key) {
    return STRINGS[lang][key] || STRINGS.zh[key] || key;
  }

  function preview(key) {
    return PREVIEWS[lang][key] || PREVIEWS.zh[key];
  }

  function applyStrings() {
    document.documentElement.lang = lang === 'zh' ? 'zh-TW' : 'en';

    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });

    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  }

  function applyPreviewData() {
    document.querySelectorAll('[data-preview-key]').forEach(el => {
      const data = preview(el.dataset.previewKey);
      if (!data) return;

      if (data.desc) el.dataset.desc = data.desc;
      if (data.tags) el.dataset.tags = data.tags;
      if (data.title) el.dataset.title = data.title;
      if (data.org) el.dataset.org = data.org;
      if (data.date) el.dataset.date = data.date;
      if (data.badge) el.dataset.badge = data.badge;

      const snippet = el.querySelector('.award-card-snippet, .project-card-snippet');
      if (snippet && data.snippet) snippet.textContent = data.snippet;

      const title = el.querySelector('.award-card-title, .project-card-title');
      if (title && data.title && el.classList.contains('award-card')) title.textContent = data.title;

      const org = el.querySelector('.award-card-org');
      if (org && data.org) org.textContent = data.org;

      const date = el.querySelector('.award-card-date');
      if (date && data.date) date.textContent = data.date;

      const badge = el.querySelector('.award-card-badge');
      if (badge && data.badge) badge.textContent = data.badge;
    });

    const cropImg = document.querySelector('[data-preview-key="projectCrop"] img');
    if (cropImg) cropImg.alt = t('projects.cropTitle');
  }

  function apply() {
    if (!ready) return;
    applyStrings();
    applyPreviewData();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  function setLang(next) {
    if (next !== 'zh' && next !== 'en') return;
    lang = next;
    localStorage.setItem('lang', lang);
    apply();
  }

  function bindLangButtons() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  }

  function init() {
    fetch('data/i18n.xml')
      .then(r => {
        if (!r.ok) throw new Error('i18n.xml fetch failed');
        return r.text();
      })
      .then(text => {
        parseXml(text);
        ready = true;
        bindLangButtons();
        apply();
        document.dispatchEvent(new CustomEvent('i18nready'));
      })
      .catch(err => {
        console.error('翻譯載入失敗', err);
        ready = true;
        bindLangButtons();
      });
  }

  window.i18n = {
    t,
    preview,
    lang: () => lang,
    setLang,
    ready: () => ready,
  };

  init();
})();
