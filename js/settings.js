// User settings. Each one is persisted to localStorage and reflected on <html>
// (data-theme / data-pinyin / data-quiz) or on its toolbar button.
// Theme and pinyin are ALSO applied by the tiny inline script in <head> so the
// first paint is already correct; this module re-applies them and owns changes.

export const SUPPORTED_LANGS = ['en', 'it'];

// ── Platform (UA sniffing; iPadOS in desktop mode reports MacIntel + touch) ──
const UA = navigator.userAgent;
const ios = /iphone|ipad|ipod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const android = /android/i.test(UA);
export const platform = { ios, android, mobile: ios || android };

// ── localStorage wrapper ───────────────────────────────────
// localStorage can throw (private mode, storage disabled, quota); every access
// goes through here so callers never need their own try/catch.
export const store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  },
};

// A Set of strings mirrored to localStorage as a JSON array.
function persistedSet(key) {
  let items = new Set();
  try {
    const arr = JSON.parse(store.get(key, '[]'));
    if (Array.isArray(arr)) items = new Set(arr);
  } catch (e) {}
  return {
    has: k => items.has(k),
    toggle(k) {
      if (items.has(k)) items.delete(k); else items.add(k);
      store.set(key, JSON.stringify([...items]));
    },
  };
}

// ── Favorites ──────────────────────────────────────────────
const favorites = persistedSet('favorites');
const favoriteKey = (tabId, hanzi) => tabId + ':' + hanzi;
export const isFavorite = (tabId, hanzi) => favorites.has(favoriteKey(tabId, hanzi));
export const toggleFavorite = (tabId, hanzi) => favorites.toggle(favoriteKey(tabId, hanzi));

// ── Collapsed groups ───────────────────────────────────────
const collapsedGroups = persistedSet('collapsedGroups');
// English title is the stable id, so the state survives a language switch.
export function collapseKey(tabId, titleObj) {
  return tabId + ':' + ((titleObj && titleObj.en) ? titleObj.en : String(titleObj));
}
export const isCollapsed = (tabId, titleObj) => collapsedGroups.has(collapseKey(tabId, titleObj));
export const toggleCollapse = key => collapsedGroups.toggle(key);

// ── Theme ──────────────────────────────────────────────────
const THEME_KEY = 'theme';
export let currentTheme = store.get(THEME_KEY);
if (currentTheme !== 'dark' && currentTheme !== 'light') {
  currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
document.documentElement.dataset.theme = currentTheme;

// Keep the browser/OS chrome (Android status bar, iOS Safari tint) matching the page background.
export function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
  meta.content = bg || (currentTheme === 'dark' ? '#12100d' : '#f5efe3');
}
syncThemeColor();

export function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.dataset.theme = theme;
  syncThemeColor();
  store.set(THEME_KEY, theme);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀︎' : '☾';
}

// ── Hide pinyin ────────────────────────────────────────────
const PINYIN_KEY = 'pinyinHidden';
export let pinyinHidden = store.get(PINYIN_KEY) === '1';
if (pinyinHidden) document.documentElement.dataset.pinyin = 'hidden';

export function setPinyinMode(hidden) {
  if (quizMode) return;
  pinyinHidden = hidden;
  if (hidden) document.documentElement.dataset.pinyin = 'hidden';
  else delete document.documentElement.dataset.pinyin;
  store.set(PINYIN_KEY, hidden ? '1' : '0');
  const btn = document.getElementById('pinyinBtn');
  if (btn) btn.classList.toggle('active', hidden);
}

// ── Quiz mode (not persisted, resets each session) ─────────
export let quizMode = false;

export function setQuizMode(on) {
  quizMode = on;
  if (on) document.documentElement.dataset.quiz = 'on';
  else delete document.documentElement.dataset.quiz;
  document.querySelectorAll('.card.revealed, .phrase-card.revealed').forEach(c => c.classList.remove('revealed'));
  const btn = document.getElementById('quizBtn');
  if (btn) btn.classList.toggle('active', on);
  const pinyinBtn = document.getElementById('pinyinBtn');
  if (pinyinBtn) pinyinBtn.disabled = on;
}

// ── Language ───────────────────────────────────────────────
const LANG_KEY = 'lang';
function detectInitialLang() {
  const stored = store.get(LANG_KEY);
  if (SUPPORTED_LANGS.includes(stored)) return stored;
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('it') ? 'it' : 'en';
}

export let currentLang = detectInitialLang();

// Only stores the value; re-rendering is app.js's job (setLang).
export function setCurrentLang(lang) {
  currentLang = lang;
  store.set(LANG_KEY, lang);
}
