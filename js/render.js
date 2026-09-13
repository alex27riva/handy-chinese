// Renders tabs, panels, cards and the favorites overlay from content.json.
// contentData lives here; app.js sets it after the fetch.
import { isFavorite, isCollapsed, collapseKey } from './settings.js';
import { CHROME, t } from './i18n.js';
import { foldSearch } from './search.js';
import { setActiveTab } from './tabs.js';

const SPEAKER_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;

const STAR_SVG = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

const CHEVRON_SVG = `<svg class="collapse-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

export let contentData = null;
export function setContentData(data) { contentData = data; }

// One entry per tab.type (content.json): the card renderer, the CSS class
// of a card, which grid wraps a section, the field-class prefix, and whether
// flat sections of that kind can collapse. content.json never names CSS
// classes; this map is the only place a type becomes markup.
// (App sections hold 1–3 entries; a chevron there would be noise.)
const CARD_KIND = {
  vocab:  { render: renderCard,    cardClass: 'card',        grid: 'grid',        prefix: '',        collapsible: true },
  phrase: { render: renderCard,    cardClass: 'phrase-card', grid: 'phrase-grid', prefix: 'phrase-', collapsible: true },
  app:    { render: renderAppCard, cardClass: 'app-card',    grid: 'app-grid',                       collapsible: false },
};
const kindOf = tab => CARD_KIND[tab.type] || CARD_KIND.vocab;

function renderCard(entry, tab) {
  const { cardClass, prefix } = kindOf(tab);
  const tabId = tab.id;
  const card = document.createElement('div');
  card.className = cardClass;
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
  for (const field of ['hanzi', 'pinyin', 'meaning']) {
    const el = document.createElement('div');
    el.className = prefix + field;
    // tag hanzi so Android/Chrome picks Simplified Chinese glyph variants,
    // not the Japanese ones, for characters shared between the scripts
    if (field === 'hanzi') el.lang = 'zh-CN';
    el.textContent = t(entry[field]);
    card.appendChild(el);
  }
  const icon = document.createElement('div');
  icon.className = 'speaker';
  icon.innerHTML = SPEAKER_SVG;
  card.appendChild(icon);

  card.dataset.search = foldSearch([entry.hanzi, entry.pinyin, t(entry.meaning)].join(' '));
  card.dataset.tab = tabId;
  card.dataset.hanzi = entry.hanzi; // with data-tab, the favorites key (see cards.js)

  const star = document.createElement('button');
  star.type = 'button';
  star.className = 'favorite-btn' + (isFavorite(tabId, entry.hanzi) ? ' active' : '');
  star.setAttribute('aria-label', 'Toggle favorite');
  star.innerHTML = STAR_SVG; // click handled by the delegated listener in cards.js
  card.appendChild(star);
  return card;
}

export function renderTabs(tabs, container) {
  tabs.forEach((tab, i) => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (i === 0 ? ' active' : '');
    btn.dataset.tab = tab.id;
    btn.type = 'button';
    btn.id = 'tabbtn-' + tab.id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', 'tab-' + tab.id);
    btn.setAttribute('aria-selected', String(i === 0));
    const hanzi = document.createElement('span');
    hanzi.className = 'tab-hanzi';
    hanzi.lang = 'zh-CN';
    hanzi.textContent = tab.hanziLabel;
    btn.appendChild(hanzi);
    btn.appendChild(document.createTextNode(t(tab.label)));
    container.appendChild(btn);
  });
}

// Single path for every section, whatever the card kind.
function renderSection(sec, tab, collapsible = false) {
  const kind = kindOf(tab);
  const section = document.createElement('div');
  section.className = 'section';
  const title = document.createElement('div');
  title.className = 'section-title';
  title.textContent = t(sec.title);
  if (collapsible && kind.collapsible && sec.title) {
    if (isCollapsed(tab.id, sec.title)) section.classList.add('is-collapsed');
    title.insertAdjacentHTML('beforeend', CHEVRON_SVG);
    title.dataset.collapseKey = collapseKey(tab.id, sec.title); // click delegated in cards.js
  }
  const grid = document.createElement('div');
  grid.className = kind.grid;
  sec.entries.forEach(entry => grid.appendChild(kind.render(entry, tab)));
  section.append(title, grid);
  return section;
}

// Subsection: a titled, collapsible group of sections (sections inside do not collapse).
function renderSubsection(sub, tab) {
  const tabId = tab.id;
  const wrap = document.createElement('div');
  wrap.className = 'subsection';
  if (sub.title) {
    if (isCollapsed(tabId, sub.title)) wrap.classList.add('is-collapsed');
    const title = document.createElement('div');
    title.className = 'subsection-title';
    title.textContent = t(sub.title);
    title.insertAdjacentHTML('beforeend', CHEVRON_SVG);
    title.dataset.collapseKey = collapseKey(tabId, sub.title); // click delegated in cards.js
    wrap.appendChild(title);
  }
  sub.sections.forEach(sec => wrap.appendChild(renderSection(sec, tab)));
  return wrap;
}

function renderAppCard(entry, tab) {
  const card = document.createElement('div');
  card.className = 'app-card';
  const icon = document.createElement('div');
  icon.className = 'app-icon';
  icon.textContent = entry.icon || '📱';
  const content = document.createElement('div');
  content.className = 'app-content';
  const nameRow = document.createElement('div');
  nameRow.className = 'app-name-row';
  const name = document.createElement('span');
  name.className = 'app-name';
  name.textContent = entry.name;
  nameRow.appendChild(name);
  const hanzi = document.createElement('span');
  hanzi.className = 'app-hanzi';
  hanzi.lang = 'zh-CN';
  hanzi.textContent = entry.hanzi;
  nameRow.appendChild(hanzi);
  const pinyin = document.createElement('div');
  pinyin.className = 'app-pinyin';
  pinyin.textContent = entry.pinyin;
  const desc = document.createElement('div');
  desc.className = 'app-desc';
  desc.textContent = t(entry.description);
  content.append(nameRow, pinyin, desc);
  card.append(icon, content);
  card.dataset.search = foldSearch([entry.hanzi, entry.pinyin, entry.name, t(entry.description)].join(' '));
  card.dataset.tab = tab.id;
  return card;
}

// Optional lead paragraph under the panel label (any tab may set `intro`).
function renderIntro(introText) {
  const intro = document.createElement('div');
  intro.className = 'app-intro';
  intro.textContent = t(introText);
  return intro;
}

export function renderPanels(tabs, container) {
  tabs.forEach((tab, i) => {
    const panel = document.createElement('div');
    panel.className = 'tab-panel' + (i === 0 ? ' active' : '');
    panel.id = 'tab-' + tab.id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'tabbtn-' + tab.id);
    const label = document.createElement('div');
    label.className = 'panel-search-label';
    label.textContent = t(tab.label);
    panel.appendChild(label);
    if (tab.intro) panel.appendChild(renderIntro(tab.intro));
    // nested: subsections collapse; flat: sections collapse (if the card kind allows)
    if (tab.subsections) {
      tab.subsections.forEach(sub => panel.appendChild(renderSubsection(sub, tab)));
    } else {
      tab.sections.forEach(sec => panel.appendChild(renderSection(sec, tab, true)));
    }
    container.appendChild(panel);
  });
  container.appendChild(renderFavoritesOverlay());
}

// ── Favorites overlay ──────────────────────────────────────
function renderFavoritesOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'favorites-overlay';
  overlay.id = 'favorites-overlay';
  overlay.innerHTML = '<div class="favorites-panel"><div class="favorites-header"><h2 lang="zh-CN">收藏</h2><button class="fav-close" aria-label="Close">✕</button></div><div class="favorites-content" id="favorites-content"></div></div>';
  return overlay;
}

function renderFavoritesContent(container) {
  let total = 0;
  if (contentData) {
    contentData.tabs.forEach(tab => {
      const groups = tab.subsections || [{ sections: tab.sections }];
      const entries = [];
      groups.forEach(g => g.sections.forEach(s => s.entries.forEach(e => {
        if (isFavorite(tab.id, e.hanzi)) entries.push(e);
      })));
      if (!entries.length) return;
      total += entries.length;
      const section = document.createElement('div');
      section.className = 'section';
      const title = document.createElement('div');
      title.className = 'subsection-title';
      title.textContent = t(tab.label);
      const grid = document.createElement('div');
      grid.className = kindOf(tab).grid;
      entries.forEach(e => grid.appendChild(renderCard(e, tab)));
      section.append(title, grid);
      container.appendChild(section);
    });
  }
  if (!total) {
    const empty = document.createElement('div');
    empty.className = 'favorites-empty';
    empty.textContent = t(CHROME.favoritesEmpty);
    container.appendChild(empty);
  }
}

// Rebuild #favorites-content in place (cards get their clicks via delegation).
export function refreshFavoritesPanel() {
  const content = document.getElementById('favorites-content');
  if (!content) return;
  content.innerHTML = '';
  renderFavoritesContent(content);
}

export function showFavorites() {
  refreshFavoritesPanel();
  document.getElementById('favorites-overlay').classList.add('active');
  document.body.classList.add('fav-open');
}

export function hideFavorites() {
  const overlay = document.getElementById('favorites-overlay');
  overlay.classList.remove('active');
  document.body.classList.remove('fav-open');
}

// Wipe and rebuild tabs + panels (used on language switch). Keeps the active tab.
export function rerenderContent() {
  if (!contentData) return;
  const tabsContainer = document.getElementById('tabs');
  const panelsContainer = document.getElementById('panels');
  const activeTab = document.querySelector('.tab.active');
  const activeId = activeTab ? activeTab.dataset.tab : contentData.tabs[0].id;
  tabsContainer.innerHTML = '';
  panelsContainer.innerHTML = '';
  renderTabs(contentData.tabs, tabsContainer);
  renderPanels(contentData.tabs, panelsContainer);
  setActiveTab(activeId);
}
