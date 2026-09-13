// Search: fold both the per-card index (data-search) and the query so
// "ni hao", "nihao" and "nǐ hǎo" all match. Non-empty query = global search
// mode (every panel visible, non-matching cards/sections/panels hidden).

// Fold for search: lowercase, strip pinyin tone marks (nǐ → ni), drop spaces.
export const foldSearch = str => String(str || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, '');

export function filterCards(query) {
  const q = foldSearch(query);
  const panelsEl = document.getElementById('panels');
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.hidden = !q;

  if (!q) {
    panelsEl.classList.remove('global-search');
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.remove('search-active', 'no-match');
      p.querySelectorAll('.card, .phrase-card, .app-card').forEach(c => c.style.display = '');
      p.querySelectorAll('.section, .subsection').forEach(s => s.style.display = '');
    });
    return;
  }

  panelsEl.classList.add('global-search');
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.add('search-active');
    let panelHasMatch = false;
    panel.querySelectorAll('.card, .phrase-card, .app-card').forEach(card => {
      const match = card.dataset.search && card.dataset.search.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) panelHasMatch = true;
    });
    panel.querySelectorAll('.section').forEach(sec => {
      const any = [...sec.querySelectorAll('.card, .phrase-card, .app-card')].some(c => c.style.display !== 'none');
      sec.style.display = any ? '' : 'none';
    });
    panel.querySelectorAll('.subsection').forEach(sub => {
      const any = [...sub.querySelectorAll('.section')].some(s => s.style.display !== 'none');
      sub.style.display = any ? '' : 'none';
    });
    panel.classList.toggle('no-match', !panelHasMatch);
  });
}
