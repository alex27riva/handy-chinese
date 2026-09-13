// Transient feedback pill (#toast).
let toastTimer = null;
export function showToast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  void el.offsetWidth; // force reflow so the opacity transition runs
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { if (!el.classList.contains('show')) el.hidden = true; }, 250);
  }, 1600);
}
