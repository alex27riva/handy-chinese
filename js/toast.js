// Transient feedback pill (#toast).
let toastTimer = null;
// opts.ms: visible time; opts.long: wrap instead of truncating (for hints)
export function showToast(text, { ms = 1600, long = false } = {}) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('toast-long', long);
  el.hidden = false;
  void el.offsetWidth; // force reflow so the opacity transition runs
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { if (!el.classList.contains('show')) el.hidden = true; }, 250);
  }, ms);
}
