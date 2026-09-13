// User settings. Each one is persisted to localStorage and reflected on <html>
// (data-theme / data-pinyin / data-quiz) or on its toolbar button.
// Theme and pinyin are ALSO applied by the tiny inline script in <head> so the
// first paint is already correct; this module re-applies them and owns changes.

export const SUPPORTED_LANGS = ['en', 'it'];

// ── Favorites ──────────────────────────────────────────────
const FAVORITES_KEY = 'favorites';
let favorites = new Set();
try {
  const raw = localStorage.getItem(FAVORITES_KEY);
  if (raw) {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) favorites = new Set(arr);
  }
} catch (e) {}

const favoriteKey = (tabId, hanzi) => tabId + ':' + hanzi;
export const isFavorite = (tabId, hanzi) => favorites.has(favoriteKey(tabId, hanzi));
export function toggleFavorite(tabId, hanzi) {
  const key = favoriteKey(tabId, hanzi);
  if (favorites.has(key)) favorites.delete(key);
  else favorites.add(key);
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); } catch (e) {}
}

// ── Collapsed groups ───────────────────────────────────────
const COLLAPSED_KEY = 'collapsedGroups';
let collapsedGroups = new Set();
try {
  const raw = localStorage.getItem(COLLAPSED_KEY);
  if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) collapsedGroups = new Set(arr); }
} catch (e) {}
// English title is the stable id, so the state survives a language switch.
export function collapseKey(tabId, titleObj) {
  return tabId + ':' + ((titleObj && titleObj.en) ? titleObj.en : String(titleObj));
}
export function isCollapsed(tabId, titleObj) { return collapsedGroups.has(collapseKey(tabId, titleObj)); }
export function toggleCollapse(key) {
  if (collapsedGroups.has(key)) collapsedGroups.delete(key); else collapsedGroups.add(key);
  try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsedGroups])); } catch (e) {}
}

// ── Theme ──────────────────────────────────────────────────
const THEME_KEY = 'theme';
export let currentTheme = 'light';
try {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') currentTheme = saved;
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches) currentTheme = 'dark';
} catch (e) {}
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
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = theme === 'dark' ? '☀︎' : '☾';
}

// ── Hide pinyin ────────────────────────────────────────────
const PINYIN_KEY = 'pinyinHidden';
export let pinyinHidden = false;
try { pinyinHidden = localStorage.getItem(PINYIN_KEY) === '1'; } catch (e) {}
if (pinyinHidden) document.documentElement.dataset.pinyin = 'hidden';

export function setPinyinMode(hidden) {
  if (quizMode) return;
  pinyinHidden = hidden;
  if (hidden) document.documentElement.dataset.pinyin = 'hidden';
  else delete document.documentElement.dataset.pinyin;
  try { localStorage.setItem(PINYIN_KEY, hidden ? '1' : '0'); } catch (e) {}
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
function detectInitialLang() {
  try {
    const stored = localStorage.getItem('lang');
    if (SUPPORTED_LANGS.includes(stored)) return stored;
  } catch (e) {}
  const nav = (navigator.language || 'en').toLowerCase();
  return nav.startsWith('it') ? 'it' : 'en';
}

export let currentLang = detectInitialLang();

// Only stores the value; re-rendering is app.js's job (setLang).
export function setCurrentLang(lang) {
  currentLang = lang;
  try { localStorage.setItem('lang', lang); } catch (e) {}
}
