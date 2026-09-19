// Search: fold both the per-card index (data-search) and the query so
// "ni hao", "nihao" and "nǐ hǎo" all match. Non-empty query = global search
// mode (every panel visible, non-matching cards/sections/panels hidden).
// Visibility is driven by the .search-hidden class (CSS: #panels .search-hidden).

// Fold for search: lowercase, strip pinyin tone marks (nǐ → ni), drop spaces.
export const foldSearch = str => String(str || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, '');

const CARD_SEL = '.card, .phrase-card, .app-card';
const VISIBLE_CARD_SEL = '.card:not(.search-hidden), .phrase-card:not(.search-hidden), .app-card:not(.search-hidden)';

// Clear every search effect on one panel (cards, sections, panel flags).
export function resetSearch(panel) {
  panel.classList.remove('search-active', 'no-match');
  panel.querySelectorAll('.search-hidden').forEach(el => el.classList.remove('search-hidden'));
}

export function filterCards(query) {
  const q = foldSearch(query);
  document.body.classList.toggle('search-on', !!q); // hide the word-of-the-day hero while searching
  const panelsEl = document.getElementById('panels');
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.hidden = !q;
  const panels = document.querySelectorAll('.tab-panel');

  if (!q) {
    panelsEl.classList.remove('global-search');
    panels.forEach(resetSearch);
    return;
  }

  panelsEl.classList.add('global-search');
  panels.forEach(panel => {
    panel.classList.add('search-active');
    let panelHasMatch = false;
    panel.querySelectorAll(CARD_SEL).forEach(card => {
      const match = !!card.dataset.search && card.dataset.search.includes(q);
      card.classList.toggle('search-hidden', !match);
      if (match) panelHasMatch = true;
    });
    panel.querySelectorAll('.section').forEach(sec => {
      sec.classList.toggle('search-hidden', !sec.querySelector(VISIBLE_CARD_SEL));
    });
    panel.querySelectorAll('.subsection').forEach(sub => {
      sub.classList.toggle('search-hidden', !sub.querySelector('.section:not(.search-hidden)'));
    });
    panel.classList.toggle('no-match', !panelHasMatch);
  });
}
