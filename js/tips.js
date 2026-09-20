// 帮手's travel tips: one practical tip at a time, in the second slide of the
// hero carousel (js/hero.js). Tapping the mascot (or the bubble) advances to
// the next one, the ✕ hides the slide for today only.
//
// The tip list lives in content.json ("tips": [{en, it}]) so it is translated
// with the rest of the content and validated by scripts/check-content.py; the
// shown index is persisted, so reopening the app resumes where you left off
// instead of restarting the list.
import { contentData } from './render.js';
import { CHROME, t } from './i18n.js';
import { store } from './settings.js';
import { dateKey } from './wod.js';

const INDEX_KEY = 'tipIndex';
const DISMISS_KEY = 'tipDismissed';
// The pose follows the tip, so a tap visibly does something.
const POSES = ['mascot-idle.svg', 'mascot-think.svg', 'mascot-hi.svg', 'mascot-celebrate.svg'];
const PAW_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="7" cy="9.5" rx="2.7" ry="3.2"/><ellipse cx="12" cy="7.5" rx="2.7" ry="3.4"/><ellipse cx="17" cy="9.5" rx="2.7" ry="3.2"/><ellipse cx="20.5" cy="14" rx="2.4" ry="2.8"/><path d="M12 12c3.4 0 6 2.3 6 5.1 0 2.2-1.9 3.6-4.2 3.6h-3.6C7.9 20.7 6 19.3 6 17.1 6 14.3 8.6 12 12 12Z"/></svg>`;

let index = 0;

// First visit: start at a tip derived from the date (same as the word of the
// day), so a fresh install does not always open on tip #1.
function dateHash() {
  let h = 0;
  for (const ch of dateKey()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function currentIndex(len) {
  const saved = parseInt(store.get(INDEX_KEY), 10);
  if (Number.isInteger(saved) && saved >= 0 && saved < len) return saved;
  return dateHash() % len;
}

// Returns whether this slide has content: js/hero.js, the carousel that owns
// the slot, hides it otherwise and falls back to the remaining slide. `notify`
// is called after a dismiss so the carousel can re-evaluate.
export function renderTip(notify) {
  const root = document.getElementById('tip');
  if (!root || !contentData) return false;
  const tips = contentData.tips;
  if (!Array.isArray(tips) || !tips.length) return false;
  if (store.get(DISMISS_KEY) === dateKey()) return false;

  index = currentIndex(tips.length);
  // The card is built once and only repainted afterwards, so a language switch
  // (which calls renderTip again) keeps the listeners single-wired.
  const card = root.querySelector('.tip-card') || buildCard(root, notify);
  paint(card, tips);
  return true;
}

function buildCard(root, notify) {
  const card = document.createElement('div');
  card.className = 'tip-card';

  const mascot = document.createElement('img');
  mascot.className = 'tip-mascot';
  mascot.alt = '';
  mascot.setAttribute('aria-hidden', 'true');
  card.appendChild(mascot);

  const bubble = document.createElement('div');
  bubble.className = 'tip-bubble';
  bubble.setAttribute('role', 'button');
  bubble.tabIndex = 0;
  card.appendChild(bubble);

  const heading = document.createElement('div');
  heading.className = 'tip-heading';
  bubble.appendChild(heading);

  const text = document.createElement('p');
  text.className = 'tip-text';
  text.setAttribute('aria-live', 'polite'); // announce the new tip on tap
  bubble.appendChild(text);

  const more = document.createElement('div');
  more.className = 'tip-more';
  more.innerHTML = PAW_SVG + '<span></span>';
  bubble.appendChild(more);

  // A real <button> for the close affordance: the card itself is a plain div,
  // so nothing nests a button inside a role="button".
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'tip-dismiss';
  dismiss.textContent = '✕';
  card.appendChild(dismiss);

  root.appendChild(card);
  wire(card, notify);
  return card;
}

function paint(card, tips) {
  card.querySelector('.tip-heading').textContent = t(CHROME.tipHeading);
  card.querySelector('.tip-text').textContent = t(tips[index]);
  card.querySelector('.tip-more span').textContent = t(CHROME.tipMore);
  card.querySelector('.tip-dismiss').setAttribute('aria-label', t(CHROME.dismissLabel));
  card.querySelector('.tip-mascot').src = './assets/' + POSES[index % POSES.length];
}

function wire(card, notify) {
  const next = () => {
    const tips = contentData.tips;
    index = (index + 1) % tips.length;
    store.set(INDEX_KEY, String(index));
    paint(card, tips);
    // Restart the swap animation: drop the class, force a reflow, re-add it.
    card.classList.remove('tip-swap');
    void card.offsetWidth;
    card.classList.add('tip-swap');
  };
  const dismiss = () => {
    store.set(DISMISS_KEY, dateKey()); // hidden for today only
    notify?.();
  };

  card.addEventListener('click', ev => {
    if (ev.target.closest('.tip-dismiss')) { dismiss(); return; }
    next();
  });
  card.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
    if (ev.target.closest('.tip-dismiss')) return; // let the button be a button
    ev.preventDefault();
    next();
  });
}
