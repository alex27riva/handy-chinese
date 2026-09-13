// Entry point: boots the app. Order matters — the install-hint block must run
// before applyChrome() (it rewrites the hint's data-i18n-html key on Android).
import {
  store, SUPPORTED_LANGS, currentTheme, setTheme, pinyinHidden, setPinyinMode,
  quizMode, setQuizMode, currentLang, setCurrentLang
} from './settings.js';
import { CHROME, t, applyChrome } from './i18n.js';
import { filterCards } from './search.js';
import { wireTabs, wireSwipe, resetTransient } from './tabs.js';
import { wirePanelClicks, wireCardKeys, wireLongPress } from './cards.js';
import {
  setContentData, renderTabs, renderPanels, rerenderContent,
  showFavorites, hideFavorites
} from './render.js';

// ── Install hint: only on iOS/Android, hidden if standalone or dismissed ──
(function () {
  const hint = document.getElementById('installHint');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone === true;
  const dismissed = store.get('hintDismissed') === '1';

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);

  if (isStandalone || dismissed || (!isIOS && !isAndroid)) {
    hint.style.display = 'none';
    return;
  }

  if (isAndroid) {
    const textEl = hint.querySelector('[data-i18n-html]');
    if (textEl) textEl.dataset.i18nHtml = 'installHintAndroid';

    let deferredPrompt = null;
    const installBtn = document.getElementById('installBtn');

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.style.display = '';
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        hint.style.display = 'none';
        store.set('hintDismissed', '1');
      });
    }

    window.addEventListener('appinstalled', () => {
      hint.style.display = 'none';
      store.set('hintDismissed', '1');
    });
  }
})();

// ── App version ────────────────────────────────────────────
// Version lives in exactly one place: the CACHE constant in sw.js (the service
// worker only reinstalls when its own bytes change, so the literal has to live
// there). The page reads it back out of Cache Storage instead of duplicating it.
const CACHE_PREFIX = 'handy-';
function showAppVersion() {
  const el = document.getElementById('appVersion');
  if (!el || !window.caches) return;
  // caches.keys() is in creation order, so the last handy-* key is the current one
  caches.keys()
    .then(keys => keys.filter(k => k.startsWith(CACHE_PREFIX)).pop())
    .then(key => { if (key) el.textContent = key.slice(CACHE_PREFIX.length); })
    .catch(() => {});
}
showAppVersion();

// ── Language ───────────────────────────────────────────────
function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang) || lang === currentLang) return;
  setCurrentLang(lang);
  resetTransient();
  applyChrome();
  rerenderContent();
  const si = document.getElementById('searchInput');
  if (si && si.value) filterCards(si.value);
}

document.querySelectorAll('.lang-switch button').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

// ── Header / toolbar buttons ───────────────────────────────
const themeBtn = document.getElementById('themeBtn');
if (themeBtn) {
  themeBtn.textContent = currentTheme === 'dark' ? '☀︎' : '☾';
  themeBtn.addEventListener('click', () => setTheme(currentTheme === 'dark' ? 'light' : 'dark'));
}

const pinyinBtn = document.getElementById('pinyinBtn');
if (pinyinBtn) {
  pinyinBtn.classList.toggle('active', pinyinHidden);
  pinyinBtn.addEventListener('click', () => setPinyinMode(!pinyinHidden));
}

const quizBtn = document.getElementById('quizBtn');
if (quizBtn) {
  quizBtn.addEventListener('click', () => setQuizMode(!quizMode));
}

applyChrome();

// About popover
const aboutBtn = document.getElementById('aboutBtn');
const aboutPanel = document.getElementById('aboutPanel');
function setAbout(open) {
  aboutPanel.hidden = !open;
  aboutBtn.classList.toggle('active', open);
  aboutBtn.setAttribute('aria-expanded', String(open));
}
aboutBtn.addEventListener('click', e => { e.stopPropagation(); setAbout(aboutPanel.hidden); });
aboutPanel.addEventListener('click', e => e.stopPropagation());
document.addEventListener('click', () => { if (!aboutPanel.hidden) setAbout(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !aboutPanel.hidden) setAbout(false); });

// Favorites overlay
document.getElementById('favBtn').addEventListener('click', showFavorites);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('fav-open')) hideFavorites();
});
document.addEventListener('click', e => {
  if (e.target.classList.contains('favorites-overlay') || e.target.classList.contains('fav-close')) {
    hideFavorites();
  }
});

// Search
document.getElementById('searchInput').addEventListener('input', e => filterCards(e.target.value));
document.getElementById('searchClear').addEventListener('click', () => {
  const si = document.getElementById('searchInput');
  si.value = '';
  filterCards('');
  si.focus();
});

// ── Content ────────────────────────────────────────────────
// All listeners are delegated on the persistent #tabs / #panels containers,
// so they are wired once here and survive every rerenderContent().
wireTabs();
wirePanelClicks();
wireSwipe();
wireLongPress();
wireCardKeys();

fetch('./content.json')
  .then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(data => {
    setContentData(data);
    renderTabs(data.tabs, document.getElementById('tabs'));
    renderPanels(data.tabs, document.getElementById('panels'));
  })
  .catch(err => {
    const panels = document.getElementById('panels');
    const msg = document.createElement('div');
    msg.className = 'load-error';
    msg.textContent = t(CHROME.loadError);
    panels.appendChild(msg);
    console.error('content load failed:', err);
  });

// ── Service worker ─────────────────────────────────────────
// sw.js calls skipWaiting() + clients.claim(), so a new worker takes control of
// this page as soon as it installs. That fires `controllerchange`; the page's
// already-loaded assets are stale at that point, so we offer a reload.
if ('serviceWorker' in navigator) {
  const updateToast = document.getElementById('updateToast');
  let hadController = !!navigator.serviceWorker.controller; // false on first install
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // first install, nothing to refresh
    showAppVersion();
    if (updateToast) {
      updateToast.hidden = false;
      void updateToast.offsetWidth;
      updateToast.classList.add('show');
    }
  });

  if (updateToast) {
    updateToast.addEventListener('click', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }

  // Module scripts are deferred, so `load` may already have fired by now.
  const registerSW = () => {
    // first install: the cache only exists once the worker is active
    navigator.serviceWorker.ready.then(showAppVersion).catch(() => {});
    navigator.serviceWorker.register('./sw.js').then(reg => {
      // Re-check for a new sw.js whenever the (installed) app comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(err => {
      console.warn('SW registration failed:', err);
    });
  };
  if (document.readyState === 'complete') registerSW();
  else window.addEventListener('load', registerSW);
}
