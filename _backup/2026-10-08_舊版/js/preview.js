// 桌面版 hover 預覽提示
(function () {
  const isTouchDevice = window.matchMedia('(hover: none)').matches;
  if (isTouchDevice) return;

  const preview = document.getElementById('preview');
  let hideTimeout = null;

  const linkKeys = {
    github: { url: 'github.com/Yo-codeback', key: 'linkGithub' },
    status: { url: 'status.ddns.ge', key: 'linkStatus' },
    'email-contact': { url: 'mailto:contact@lxyo.cc.cd', key: 'linkEmailContact' },
    'email-me': { url: 'mailto:me@lxyo.cc.cd', key: 'linkEmailMe' },
  };

  function showSkillPreview(el) {
    const tags = el.dataset.tags ? el.dataset.tags.split(',') : [];
    preview.innerHTML = `
      <div class="preview-icon" style="background:rgba(110,231,183,0.08);">${el.dataset.icon}</div>
      <div class="preview-title">${el.dataset.title}</div>
      <div class="preview-desc">${el.dataset.desc}</div>
      ${tags.length ? `<div class="preview-tags">${tags.map(t => `<span class="preview-tag">${t.trim()}</span>`).join('')}</div>` : ''}
    `;
  }

  function showAwardPreview(el) {
    const tags = el.dataset.tags ? el.dataset.tags.split(',') : [];
    preview.innerHTML = `
      <div class="preview-icon" style="background:rgba(110,231,183,0.08);">${el.dataset.icon}</div>
      <div class="preview-org">${el.dataset.org}</div>
      <div class="preview-title">${el.dataset.title}</div>
      <div class="preview-desc">${el.dataset.desc}</div>
      <div class="preview-date">${el.dataset.date}</div>
      <span class="preview-badge">${el.dataset.badge}</span>
      ${tags.length ? `<div class="preview-tags">${tags.map(t => `<span class="preview-tag">${t.trim()}</span>`).join('')}</div>` : ''}
    `;
  }

  function showProjectPreview(el) {
    const tags = el.dataset.tags ? el.dataset.tags.split(',') : [];
    const imgHtml = el.dataset.img
      ? `<img src="${el.dataset.img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`
      : `<div class="preview-img-placeholder">${el.dataset.icon || ''}</div>`;
    preview.innerHTML = `
      <div class="preview-img">${imgHtml}</div>
      <div class="preview-site-bar">
        <div class="preview-favicon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
        </div>
        <div class="preview-url">${el.dataset.url}</div>
      </div>
      <div class="preview-title">${el.dataset.title}</div>
      <div class="preview-desc">${el.dataset.desc}</div>
      ${tags.length ? `<div class="preview-tags">${tags.map(t => `<span class="preview-tag">${t.trim()}</span>`).join('')}</div>` : ''}
    `;
  }

  function showLinkPreview(el) {
    const link = linkKeys[el.dataset.linkPreview];
    if (!link) return;
    const previewData = window.i18n ? window.i18n.preview(link.key) : {};
    const data = { url: link.url, title: previewData.title, desc: previewData.desc };
    preview.innerHTML = `
      <div class="preview-img"><div class="preview-img-placeholder">PREVIEW</div></div>
      <div class="preview-site-bar">
        <div class="preview-favicon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
        </div>
        <div class="preview-url">${data.url}</div>
      </div>
      <div class="preview-title">${data.title}</div>
      <div class="preview-desc">${data.desc}</div>
    `;
  }

  function positionPreview(el) {
    const rect = el.getBoundingClientRect();
    const pw = 300;
    let left = rect.left + rect.width / 2 - pw / 2;
    let top = rect.top - preview.offsetHeight - 12;
    if (top < 12) top = rect.bottom + 12;
    if (left < 12) left = 12;
    if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
    preview.style.width = pw + 'px';
    preview.style.left = left + 'px';
    preview.style.top = top + 'px';
  }

  function show(el) {
    if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
    if (el.classList.contains('skill')) showSkillPreview(el);
    else if (el.classList.contains('award-card')) showAwardPreview(el);
    else if (el.classList.contains('project-card')) showProjectPreview(el);
    else if (el.dataset.linkPreview) showLinkPreview(el);
    positionPreview(el);
    preview.classList.add('active');
  }

  function hide() {
    hideTimeout = setTimeout(() => preview.classList.remove('active'), 100);
  }

  document.querySelectorAll('.skill, .link, .award-card, .project-card').forEach(el => {
    el.addEventListener('mouseenter', () => show(el));
    el.addEventListener('mouseleave', hide);
  });
})();
