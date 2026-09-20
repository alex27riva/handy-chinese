// Word / phrase of the day: one entry from content.json, rotated daily by a
// date hash. Fills the #wod slide of the hero carousel (js/hero.js), outside
// #panels, so it is unaffected by rerenderContent() — re-rendered only on
// language switch and first load (app.js). Reuses the standard .hanzi /
// .pinyin / .meaning field classes so show-mode and the 拼 hide-pinyin toggle
// keep working for free.
import { contentData, refreshFavoritesPanel } from './render.js';
import { CHROME, t } from './i18n.js';
import { store, isFavorite, toggleFavorite } from './settings.js';
import { speak } from './tts.js';
import { syncStars } from './cards.js';
import { openShow } from './show.js';

const STAR_SVG = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
const DISMISS_KEY = 'wodDismissed';
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_PX = 10;

// Local YYYY-MM-DD; the same key drives both the rotation and the dismiss, so
// dismissing hides only today's entry and the next day surfaces a new one.
// Shared with js/tips.js, whose card is dismissed the same way.
export function dateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Every vocab + phrase entry with a hanzi and a meaning. contentData.tabs is
// the content.json tabs only — the synthetic 我的 tab is not in there, so user
// entries never leak into the daily pool.
function pool() {
  const out = [];
  for (const tab of contentData.tabs) {
    if (tab.type !== 'vocab' && tab.type !== 'phrase') continue;
    const groups = tab.subsections || [{ sections: tab.sections }];
    for (const g of groups) for (const s of g.sections) for (const e of s.entries) {
      if (e.hanzi && e.meaning) out.push({ tabId: tab.id, tabLabel: tab.label, hanzi: e.hanzi, pinyin: e.pinyin, meaning: e.meaning });
    }
  }
  return out;
}

// Deterministic per-day index: consecutive dates hash to far-apart entries.
function pick(list) {
  const key = dateKey();
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

// Returns whether this slide has content: js/hero.js, the carousel that owns
// the slot, hides it otherwise and falls back to the remaining slide. `notify`
// is called after a dismiss so the carousel can re-evaluate.
export function renderWordOfDay(notify) {
  const root = document.getElementById('wod');
  if (!root || !contentData) return false;
  const list = pool();
  if (!list.length) return false;
  const key = dateKey();
  if (store.get(DISMISS_KEY) === key) return false;

  const e = pick(list);
  root.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'wod-card';
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
  card.dataset.tab = e.tabId;
  card.dataset.hanzi = e.hanzi;

  // Text column + mascot column: the card is a flex row (style.css), so the
  // mascot is a real flex item centred against the text block instead of being
  // pinned to the right edge over the star gutter.
  const main = document.createElement('div');
  main.className = 'wod-main';
  card.appendChild(main);

  const eyebrow = document.createElement('div');
  eyebrow.className = 'wod-eyebrow';
  eyebrow.textContent = t(CHROME.wordOfDay);
  main.appendChild(eyebrow);

  const hanzi = document.createElement('div');
  hanzi.className = 'wod-hanzi hanzi';
  hanzi.lang = 'zh-CN';
  hanzi.textContent = e.hanzi;
  main.appendChild(hanzi);

  if (e.pinyin) {
    const pinyin = document.createElement('div');
    pinyin.className = 'wod-pinyin pinyin';
    pinyin.textContent = e.pinyin;
    main.appendChild(pinyin);
  }

  const meaning = document.createElement('div');
  meaning.className = 'wod-meaning meaning';
  meaning.textContent = t(e.meaning);
  main.appendChild(meaning);

  const mascot = document.createElement('img');
  mascot.className = 'wod-mascot';
  mascot.src = './assets/mascot-idle.svg';
  mascot.alt = '';
  card.appendChild(mascot);

  const star = document.createElement('button');
  star.type = 'button';
  star.className = 'wod-star favorite-btn' + (isFavorite(e.tabId, e.hanzi) ? ' active' : '');
  star.setAttribute('aria-label', 'Toggle favorite');
  star.innerHTML = STAR_SVG;
  card.appendChild(star);

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'wod-dismiss';
  dismiss.setAttribute('aria-label', 'Dismiss');
  dismiss.textContent = '✕';
  card.appendChild(dismiss);

  root.appendChild(card);
  wire(card, e, key, notify);
  return true;
}

function wire(card, e, key, notify) {
  const dismiss = () => {
    store.set(DISMISS_KEY, key); // hidden for today only
    notify?.();
  };
  const star = () => {
    toggleFavorite(e.tabId, e.hanzi);
    syncStars(e.tabId, e.hanzi);
    refreshFavoritesPanel();
  };

  card.addEventListener('click', ev => {
    if (card.dataset.longPressed) { delete card.dataset.longPressed; return; } // hold → show mode, swallow the click
    if (ev.target.closest('.wod-dismiss')) { dismiss(); return; }
    if (ev.target.closest('.favorite-btn')) { star(); return; }
    speak(e.hanzi, card);
  });
  card.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
    if (ev.target.closest('button')) return;
    ev.preventDefault();
    speak(e.hanzi, card);
  });

  // Long-press → show mode (mirrors cards.js wireLongPress, but scoped to this
  // one card which lives outside the delegated #panels listener).
  let timer = null, armed = false, x0 = 0, y0 = 0;
  const reset = () => { clearTimeout(timer); timer = null; armed = false; card.classList.remove('press-armed'); };
  card.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || ev.target.closest('button')) return;
    x0 = ev.clientX; y0 = ev.clientY;
    timer = setTimeout(() => { timer = null; armed = true; card.classList.add('press-armed'); if (navigator.vibrate) navigator.vibrate(30); }, LONG_PRESS_MS);
  });
  card.addEventListener('pointermove', ev => {
    if (!timer && !armed) return;
    if (Math.abs(ev.clientX - x0) > LONG_PRESS_MOVE_PX || Math.abs(ev.clientY - y0) > LONG_PRESS_MOVE_PX) reset();
  });
  card.addEventListener('pointerup', () => {
    if (armed) { card.dataset.longPressed = '1'; reset(); openShow(card); return; }
    reset();
  });
  card.addEventListener('pointercancel', reset);
  card.addEventListener('pointerleave', reset);
  card.addEventListener('contextmenu', ev => ev.preventDefault());
}
