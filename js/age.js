// 年齡自動計算（生日：2011/08/05）
(function () {
  const BIRTH = new Date(2011, 7, 5);
  const today = new Date();
  let age = today.getFullYear() - BIRTH.getFullYear();
  const m = today.getMonth() - BIRTH.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < BIRTH.getDate())) age--;
  window.LXY_AGE = age;
  document.querySelectorAll('[data-age]').forEach(el => { el.textContent = age; });
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = today.getFullYear(); });
})();
