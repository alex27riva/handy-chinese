// Show mode: fullscreen hanzi to hold up to someone (taxi driver, waiter).
// Opened by holding a card (see wireLongPress in cards.js). Carries the card's
// actions — speak, copy, star, Pleco — so moving the clipboard write off the
// long-press loses nothing; the copy button is a click, which is the
// user-activation iOS Safari needs for clipboard access.
import { platform, isFavorite, toggleFavorite } from './settings.js';
import { speak, cancelSpeech } from './tts.js';
import { copyText, cardHanzi, syncStars } from './cards.js';
import { refreshFavoritesPanel, plecoUrl } from './render.js';

let root, hanziEl, pinyinEl, meaningEl, starBtn, plecoBtn, closeBtn;
let current = null;  // { text, tab, key, card }
let wakeLock = null;

// Biggest glyphs that still fit: up to five per line, wrapping beyond that,
// capped by the viewport height so one character never dwarfs the actions.
function fitHanzi(text) {
  const n = Math.max(1, [...text].length);
  const perLine = Math.min(n, 5);
  const size = Math.min(window.innerWidth * 0.86 / perLine, window.innerHeight * 0.32);
  hanziEl.style.fontSize = Math.max(40, Math.floor(size)) + 'px';
}

function syncShowStar() {
  if (!current || !current.key) return;
  starBtn.classList.toggle('active', isFavorite(current.tab, current.key));
}

// The screen would dim while the phone is held up; keep it on while open.
async function requestWakeLock() {
  try {
    if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { wakeLock = null; }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

export function openShow(card) {
  const text = cardHanzi(card);
  if (!text) return;
  const pinyin = card.querySelector('.pinyin, .phrase-pinyin, .app-pinyin');
  const meaning = card.querySelector('.meaning, .phrase-meaning, .app-name');
  current = {
    text,
    tab: card.dataset.tab,
    key: card.querySelector('.favorite-btn') ? card.dataset.hanzi : null, // app cards have no star
    card,
  };
  hanziEl.textContent = text;
  fitHanzi(text);
  pinyinEl.textContent = pinyin ? pinyin.textContent : '';
  meaningEl.textContent = meaning ? meaning.textContent : '';
  starBtn.hidden = !current.key;
  syncShowStar();
  plecoBtn.hidden = !platform.mobile;
  if (platform.mobile) plecoBtn.href = plecoUrl(text);
  root.hidden = false;
  document.body.classList.add('show-open');
  closeBtn.focus();
  requestWakeLock();
}

export function closeShow() {
  if (root.hidden) return;
  cancelSpeech();
  hanziEl.classList.remove('speaking');
  releaseWakeLock();
  root.hidden = true;
  document.body.classList.remove('show-open');
  const card = current && current.card;
  current = null;
  if (card && card.isConnected) card.focus();
}

export const isShowOpen = () => root && !root.hidden;

export function wireShow() {
  root = document.getElementById('showMode');
  hanziEl = document.getElementById('showHanzi');
  pinyinEl = document.getElementById('showPinyin');
  meaningEl = document.getElementById('showMeaning');
  starBtn = document.getElementById('showStar');
  plecoBtn = document.getElementById('showPleco');
  closeBtn = document.getElementById('showClose');

  closeBtn.addEventListener('click', closeShow);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isShowOpen()) closeShow(); });

  document.getElementById('showSpeak').addEventListener('click', () => {
    if (current) speak(current.text, hanziEl);
  });
  document.getElementById('showCopy').addEventListener('click', () => {
    if (current) copyText(current.text); // synchronous: inside the click
  });
  starBtn.addEventListener('click', () => {
    if (!current || !current.key) return;
    toggleFavorite(current.tab, current.key);
    syncStars(current.tab, current.key);
    refreshFavoritesPanel();
    syncShowStar();
  });

  window.addEventListener('resize', () => { if (current) fitHanzi(current.text); });
  // the OS drops the wake lock when the page is hidden; take it again on return
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isShowOpen()) requestWakeLock();
  });
}
