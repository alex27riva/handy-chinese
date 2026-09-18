// Jump bar: a sticky row of chips under the toolbar, one per subsection (vocab)
// or per section (phrases), so a long tab can be navigated without scrolling
// through it. render.js decides which tabs get one; wired once here on the
// persistent #panels (click + scroll-spy), so it survives rerenderContent().
import { toggleCollapse } from './settings.js';
import { CHROME, t } from './i18n.js';

// Nested tabs jump between subsections, flat tabs between their top-level
// sections. `data-groups` is the selector (scoped to the panel) that lists
// the targets, in chip order.
export function renderJumpBar(tab) {
  const nested = !!tab.subsections;
  const groups = nested ? tab.subsections : tab.sections;
  const bar = document.createElement('nav');
  bar.className = 'jump-bar';
  bar.dataset.groups = nested ? '.subsection' : ':scope > .section';
  bar.setAttribute('aria-label', t(CHROME.jumpLabel));
  groups.forEach((g, i) => {
    if (!g.title) return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'jump-chip';
    chip.dataset.jump = String(i);
    chip.textContent = t(g.short || g.title); // optional short label keeps the row compact
    bar.appendChild(chip);
  });
  return bar;
}

const groupsOf = bar => bar.closest('.tab-panel').querySelectorAll(bar.dataset.groups);

// Bottom edge of the sticky chrome (toolbar + jump bar) once both are stuck.
function stuckBottom(bar) {
  const toolbar = document.querySelector('.toolbar');
  return (toolbar ? toolbar.offsetHeight : 0) + bar.offsetHeight;
}

function jumpTo(bar, index) {
  const sub = groupsOf(bar)[index];
  if (!sub) return;
  const title = sub.querySelector(':scope > [data-collapse-key]');
  if (sub.classList.contains('is-collapsed') && title) {
    toggleCollapse(title.dataset.collapseKey); // landing on a collapsed group would show nothing
    sub.classList.remove('is-collapsed');
  }
  const top = window.scrollY + sub.getBoundingClientRect().top - stuckBottom(bar) - 8;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

// Mark the chip of the subsection currently under the sticky chrome.
function updateActive() {
  const bar = document.querySelector('.tab-panel.active .jump-bar');
  if (!bar) return;
  const subs = groupsOf(bar);
  const edge = stuckBottom(bar) + 8;
  let current = 0;
  subs.forEach((sub, i) => { if (sub.getBoundingClientRect().top <= edge + 1) current = i; });
  bar.querySelectorAll('.jump-chip').forEach(chip => {
    const on = Number(chip.dataset.jump) === current;
    chip.classList.toggle('active', on);
    if (on) chip.setAttribute('aria-current', 'true');
    else chip.removeAttribute('aria-current');
  });
}

export function wireJumpBar() {
  const panels = document.getElementById('panels');
  panels.addEventListener('click', e => {
    const chip = e.target.closest('.jump-chip');
    if (chip) jumpTo(chip.closest('.jump-bar'), Number(chip.dataset.jump));
  });

  // The bar sticks just under the toolbar; CSS reads the toolbar's height
  // from --toolbar-h (it changes with font size and viewport width).
  const toolbar = document.querySelector('.toolbar');
  const syncToolbarHeight = () => {
    document.documentElement.style.setProperty('--toolbar-h', toolbar.offsetHeight + 'px');
  };
  if (toolbar) {
    syncToolbarHeight();
    if ('ResizeObserver' in window) new ResizeObserver(syncToolbarHeight).observe(toolbar);
    else window.addEventListener('resize', syncToolbarHeight);
  }

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; updateActive(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  // collapse toggles and tab switches move the titles without a scroll event
  document.addEventListener('click', onScroll);
  new MutationObserver(onScroll).observe(panels, { childList: true });
}
