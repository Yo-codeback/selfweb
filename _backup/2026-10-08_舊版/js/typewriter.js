// 打字機效果
(function () {
  const el = document.getElementById('typed');
  if (!el) return;

  let timer = null;
  let i = 0;

  function type(text) {
    if (timer) clearTimeout(timer);
    i = 0;
    el.textContent = '';

    function step() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        timer = setTimeout(step, 90);
      }
    }

    timer = setTimeout(step, 300);
  }

  function start() {
    const text = window.i18n ? window.i18n.t('hero.bio') : '';
    if (!text) return;
    type(text);
  }

  document.addEventListener('i18nready', () => setTimeout(start, 1100));
  document.addEventListener('langchange', start);
})();
