// Tab navigation: single owner of active-tab DOM state, clicks and swipes.
import { cancelSpeech } from './tts.js';
import { filterCards } from './search.js';

// Single owner of the active-tab DOM state (classes + aria), so the tab strip
// and the panels can never disagree about which tab is selected.
export function setActiveTab(targetId) {
  document.querySelectorAll('.tab').forEach(tab => {
    const on = tab.dataset.tab === targetId;
    tab.classList.toggle('active', on);
    tab.setAttribute('aria-selected', String(on));
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + targetId);
  });
}

// Drop per-session card state that should not survive a navigation:
// stop speech, clear the speaking highlight, hide quiz reveals.
export function resetTransient() {
  cancelSpeech();
  document.querySelectorAll('.speaking').forEach(el => el.classList.remove('speaking'));
  document.querySelectorAll('.card.revealed, .phrase-card.revealed').forEach(c => c.classList.remove('revealed'));
}

export function switchToTab(targetId) {
  setActiveTab(targetId);
  resetTransient();
  const si = document.getElementById('searchInput');
  if (si && si.value) { si.value = ''; filterCards(''); }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delegated on the persistent #tabs, so it survives rerenderContent().
export function wireTabs() {
  document.getElementById('tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (tab) switchToTab(tab.dataset.tab);
  });
}

// Attaches once to the persistent #panels; survives rerenderContent().
export function wireSwipe() {
  const panels = document.getElementById('panels');
  let startX = 0, startY = 0;
  panels.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  panels.addEventListener('touchend', e => {
    if (document.body.classList.contains('fav-open') || document.body.classList.contains('sheet-open')) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const activeIdx = tabs.findIndex(t => t.classList.contains('active'));
    const nextIdx = dx < 0 ? activeIdx + 1 : activeIdx - 1;
    if (nextIdx >= 0 && nextIdx < tabs.length) {
      switchToTab(tabs[nextIdx].dataset.tab);
      tabs[nextIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, { passive: true });
}
