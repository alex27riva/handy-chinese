// The hero slot above the tabs: the word of the day (js/wod.js) and 帮手's tip
// (js/tips.js) are two slides of one carousel, so the two only ever cost one
// card's worth of vertical space. They are flipped by swiping sideways on the
// slot, or by the chevron in the right gutter both cards already reserve for
// their own buttons — no indicator row, which would eat back the height this
// saves.
//
// Each slide keeps its own module, its own daily dismiss and its own tap
// behaviour (speak the word / advance to the next tip); this module only
// decides which slides exist and which one is in view. Both render functions
// take a notify callback and return whether they have content, so dismissing
// one slide lets the carousel fall back to the other. Nothing is persisted
// here: reopening the app lands on the word of the day, which is the daily
// anchor.
import { renderWordOfDay } from './wod.js';
import { renderTip } from './tips.js';
import { CHROME, t } from './i18n.js';

const SLIDES = ['wod', 'tip'];
const SWIPE_MIN_PX = 50;

// Chevron pointing at the slide that is *not* in view; flipped by CSS for the
// 'left' direction, so the button always says "the other one is this way".
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';

let index = 0;
let wired = false;
let swipedAt = 0;

export function renderHero() {
  const root = document.getElementById('hero');
  if (!root || !root.querySelector('.hero-track')) return;

  // Render order fixes the slide order: word of the day, then the tip.
  const filled = [renderWordOfDay(renderHero), renderTip(renderHero)];

  const alive = [];
  SLIDES.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !filled[i];
    if (filled[i]) alive.push(i);
  });

  root.hidden = alive.length === 0;
  if (!alive.length) return;

  // A dismissed slide leaves the carousel showing whichever one is left.
  if (!alive.includes(index)) index = alive[0];
  apply(root, alive);
  wire(root);
}

function apply(root, alive) {
  const track = root.querySelector('.hero-track');
  track.style.transform = `translateX(${-100 * index}%)`;

  // The off-screen slide is inert, so it stays out of the tab order and out of
  // the accessibility tree instead of being read as part of the visible card.
  SLIDES.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.inert = i !== index;
    if (i === index) el.removeAttribute('aria-hidden');
    else el.setAttribute('aria-hidden', 'true');
  });

  const nav = document.getElementById('heroNav');
  if (!nav) return;
  nav.hidden = alive.length < 2;
  nav.dataset.dir = index === 0 ? 'right' : 'left';
  nav.innerHTML = CHEVRON_SVG;
  nav.setAttribute('aria-label', t(index === 0 ? CHROME.heroShowTip : CHROME.heroShowWord));
}

// Absolute slide positions (not indices into `alive`), so `index` stays
// meaningful when one slide is dismissed.
function liveIndices() {
  return SLIDES.map((id, i) => (document.getElementById(id)?.hidden === false ? i : -1)).filter(i => i >= 0);
}

function go(root, dir) {
  const alive = liveIndices();
  if (alive.length < 2) return;
  const at = alive.indexOf(index);
  index = alive[(at + dir + alive.length) % alive.length];
  apply(root, alive);
}

function wire(root) {
  if (wired) return;
  wired = true;

  document.getElementById('heroNav').addEventListener('click', () => go(root, 1));
  document.getElementById('heroNav').addEventListener('keydown', ev => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    go(root, ev.key === 'ArrowRight' ? 1 : -1);
  });

  // A new gesture ends any swipe that is still inside the swallow window, so a
  // quick tap right after a swipe is never eaten.
  const startGesture = () => { swipedAt = 0; };

  let x0 = 0, y0 = 0, tracking = false;
  root.addEventListener('pointerdown', startGesture, { passive: true });
  root.addEventListener('touchstart', ev => {
    startGesture();
    if (ev.touches.length !== 1) { tracking = false; return; }
    x0 = ev.touches[0].clientX;
    y0 = ev.touches[0].clientY;
    tracking = true;
  }, { passive: true });

  root.addEventListener('touchend', ev => {
    if (!tracking) return;
    tracking = false;
    const touch = ev.changedTouches[0];
    const dx = touch.clientX - x0;
    const dy = touch.clientY - y0;
    // A vertical drag is a scroll, never a slide change.
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return;
    swipedAt = Date.now();
    go(root, dx < 0 ? 1 : -1);
  }, { passive: true });

  // A swipe also lands as a click on the card underneath (speak the word,
  // advance the tip, which would fire on every swipe). Capture phase runs
  // before the card's own handler, so the click can be swallowed here. The
  // window matters: a swipe that produces no click at all must not swallow the
  // user's next real tap.
  root.addEventListener('click', ev => {
    if (Date.now() - swipedAt > 400) return;
    swipedAt = 0;
    ev.stopPropagation();
    ev.preventDefault();
  }, true);
}
