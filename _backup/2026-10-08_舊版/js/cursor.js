// 自訂游標：圓點即時跟隨、外圈平滑跟隨
(function initCustomCursor() {
  if (window.matchMedia('(hover: none)').matches) return;

  var dot = document.getElementById('cursor-dot');
  var ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  var mouse = { x: -100, y: -100 };
  var ringPos = { x: -100, y: -100 };

  document.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    dot.style.left = mouse.x + 'px';
    dot.style.top = mouse.y + 'px';
    var t = e.target;
    if (t.closest('a') || t.closest('button') || t.closest('input') || t.closest('select') || t.closest('textarea') || t.closest('.skill') || t.closest('.award-card') || t.closest('.project-card'))
      document.body.classList.add('cursor-hover');
    else
      document.body.classList.remove('cursor-hover');
  });

  function animateRing() {
    ringPos.x += (mouse.x - ringPos.x) * 0.18;
    ringPos.y += (mouse.y - ringPos.y) * 0.18;
    ring.style.left = ringPos.x + 'px';
    ring.style.top = ringPos.y + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();
})();
