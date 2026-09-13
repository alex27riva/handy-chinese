// Card interaction: tap (TTS / quiz reveal / search navigation), keyboard
// activation, and long-press to copy the hanzi.
import { quizMode, isFavorite, toggleFavorite, toggleCollapse } from './settings.js';
import { CHROME, t } from './i18n.js';
import { synth, speak } from './tts.js';
import { resetSearch } from './search.js';
import { setActiveTab, resetTransient } from './tabs.js';
import { refreshFavoritesPanel } from './render.js';
import { showToast } from './toast.js';

// Shared click handler for cards in the panels and in the favorites overlay.
// Dispatches first on global search (navigate to the card's tab), then on quiz mode.
export function handleCardClick(card) {
  if (card.dataset.longPressed) {
    delete card.dataset.longPressed;
    return;
  }
  if (document.getElementById('panels').classList.contains('global-search')) {
    const tabId = card.dataset.tab;
    if (tabId) {
      setActiveTab(tabId);
      document.getElementById('panels').classList.remove('global-search');
      // other panels drop their search state; the target keeps its filtered view
      document.querySelectorAll('.tab-panel:not(.active)').forEach(resetSearch);
      const activePanel = document.querySelector('.tab-panel.active');
      if (activePanel) activePanel.classList.remove('no-match');
      resetTransient();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  if (quizMode) {
    const wasRevealed = card.classList.contains('revealed');
    card.classList.toggle('revealed');
    if (!wasRevealed) {
      const hanziEl = card.querySelector('.hanzi, .phrase-hanzi');
      speak(hanziEl.textContent.trim(), card);
    } else {
      if (synth) synth.cancel();
      card.classList.remove('speaking');
    }
  } else {
    const hanziEl = card.querySelector('.hanzi, .phrase-hanzi');
    speak(hanziEl.textContent.trim(), card);
  }
}

// Every star for the same entry (main panel + favorites overlay) shows one state.
function syncStars(tabId, hanzi) {
  const on = isFavorite(tabId, hanzi);
  document.querySelectorAll('.favorite-btn').forEach(star => {
    const card = star.closest('[data-tab]');
    if (card && card.dataset.tab === tabId && card.dataset.hanzi === hanzi) star.classList.toggle('active', on);
  });
}

// One delegated click listener on the persistent #panels covers cards, stars
// and collapsible titles in every panel and in the favorites overlay, and
// survives rerenderContent().
export function wirePanelClicks() {
  document.getElementById('panels').addEventListener('click', e => {
    const star = e.target.closest('.favorite-btn');
    if (star) {
      const card = star.closest('[data-tab]');
      if (!card) return;
      toggleFavorite(card.dataset.tab, card.dataset.hanzi);
      syncStars(card.dataset.tab, card.dataset.hanzi);
      refreshFavoritesPanel();
      return; // not a card tap: no TTS
    }
    const title = e.target.closest('[data-collapse-key]');
    if (title) {
      toggleCollapse(title.dataset.collapseKey);
      title.parentElement.classList.toggle('is-collapsed');
      return;
    }
    const card = e.target.closest('.card, .phrase-card');
    if (card) handleCardClick(card);
  });
}

// Enter / Space activate a card, matching its role="button".
// Delegated to the persistent #panels so it survives rerenderContent().
export function wireCardKeys() {
  document.getElementById('panels').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const card = e.target.closest('.card, .phrase-card');
    if (!card || e.target.closest('button')) return;
    e.preventDefault(); // Space would otherwise scroll the page
    handleCardClick(card);
  });
}

// ── Copy hanzi: long-press any card ────────────────────────
// iOS Safari only honours clipboard writes made synchronously inside a
// user-activation handler (pointerup / touchend), never from a timer. So the
// long-press timer only ARMS the card; the actual write happens on release.
function execCommandCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}

// Must be called synchronously from a user-gesture event handler.
function copyText(text) {
  const done = ok => showToast(ok ? t(CHROME.copied) + ' · ' + text : t(CHROME.copyFailed));
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => done(true))
      .catch(() => done(execCommandCopy(text)));
  } else {
    done(execCommandCopy(text));
  }
}

function cardHanzi(card) {
  const el = card.querySelector('.hanzi, .phrase-hanzi, .app-hanzi');
  return el ? el.textContent.trim() : '';
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_PX = 10;
export function wireLongPress() {
  const panels = document.getElementById('panels');
  let timer = null, card = null, armed = null, x0 = 0, y0 = 0;
  const reset = () => {
    clearTimeout(timer); timer = null; card = null;
    if (armed) armed.classList.remove('copy-armed');
    armed = null;
  };
  panels.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const target = e.target.closest('.card, .phrase-card, .app-card');
    if (!target || e.target.closest('button')) return;
    reset();
    card = target; x0 = e.clientX; y0 = e.clientY;
    timer = setTimeout(() => {
      timer = null;
      armed = card;
      armed.classList.add('copy-armed');
      if (navigator.vibrate) navigator.vibrate(30);
    }, LONG_PRESS_MS);
  });
  panels.addEventListener('pointermove', e => {
    if (!timer && !armed) return;
    if (Math.abs(e.clientX - x0) > LONG_PRESS_MOVE_PX || Math.abs(e.clientY - y0) > LONG_PRESS_MOVE_PX) reset();
  });
  panels.addEventListener('pointerup', () => {
    if (armed) {
      const c = armed;
      const text = cardHanzi(c);
      c.dataset.longPressed = '1';
      c.classList.add('copied');
      setTimeout(() => c.classList.remove('copied'), 400);
      reset();
      if (text) copyText(text); // synchronous: still inside the user gesture
      return;
    }
    reset();
  });
  panels.addEventListener('pointercancel', reset);
  panels.addEventListener('pointerleave', reset);
  panels.addEventListener('contextmenu', e => {
    if (e.target.closest('.card, .phrase-card, .app-card')) e.preventDefault();
  });
}
