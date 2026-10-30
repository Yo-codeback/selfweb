// 導覽列捲動狀態與當前區塊高亮
(function () {
  const nav = document.getElementById('nav');
  const links = nav.querySelectorAll('.nav-links a');
  const sections = ['about', 'experience', 'awards', 'projects', 'skills', 'contact'].map(id => document.getElementById(id));

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);

    let current = '';
    sections.forEach(sec => {
      if (sec && window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  });
})();
