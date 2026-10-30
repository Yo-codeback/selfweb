// 年齡自動計算（生日：2011/08/05）
(function () {
  const BIRTH = new Date(2011, 7, 5);
  const today = new Date();
  let age = today.getFullYear() - BIRTH.getFullYear();
  const m = today.getMonth() - BIRTH.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < BIRTH.getDate())) age--;
  document.getElementById('age').textContent = age;
  document.getElementById('year').textContent = today.getFullYear();
})();
