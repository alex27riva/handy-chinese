# Review

Open items only. Last updated 2026-09-13, against v0.16.0. Done items are recorded in git history and `CLAUDE.md`.

---

## 1. UI & visual

Remaining from the 2026-09-09 visual review. The warm paper / ink / seal-red / gold identity is settled; these are polish.

- **Card border in dark mode.** Resting shadow shipped in v0.16.0; the border-opacity half is still open. Cards could use a slightly lighter `--line` so edges read without the shadow.
- **Tab active state (desktop strip).** Solid ink block × 5 tabs is heavy. Try a 2px red underline with ink text in the ≥700px top strip; keep the current style for the bottom bar.
- **Missing zh voice detection.** With no `zh-*` voice, iOS reads hanzi with the default voice. Show a one-time hint pointing to Settings → Accessibility → Spoken Content.
- **Maskable icon.** Add a PNG or SVG with `"purpose": "maskable"` to `manifest.json` for Android adaptive icons.

---

## 2. Code structure

Reviewed 2026-09-13. App is healthy and well documented; the problems below are mostly in the `index.html` script (~700 lines inline). Ranked, highest impact first.

### 1. Split the inline script into ES modules

`index.html` holds ~700 lines of JS. ES modules need no build step. Suggested split:

| File | Owns |
|---|---|
| `js/prefs.js` | localStorage wrappers, theme, lang, pinyin, favorites, collapsed |
| `js/i18n.js` | `CHROME`, `t()`, `applyChrome()` |
| `js/render.js` | `renderCard`, `renderSection`, `renderPanels`, favorites overlay |
| `js/search.js` | `foldSearch`, `filterCards` |
| `js/tts.js` | `pickVoice`, `speak` |
| `js/app.js` | boot, wiring, SW registration |

Keep one tiny inline `<script>` in `<head>` that sets the theme and pinyin `dataset` before first paint. Module scripts are deferred, so moving that code would reintroduce the theme flash. Add every new file to `ASSETS` in `sw.js` and bump `CACHE`.

### 2. Delegate all card events on `#panels`

Already delegated: keydown (`wireCardKeys`), long-press (`wireLongPress`). Not delegated: card click (`wireCards`), star click (per card in `renderCard`), collapse titles, tab buttons. Consequences today:

- `wireCards()` and `wireTabs()` must re-run on every `rerenderContent()`.
- `showFavorites()` and `refreshFavoritesPanel()` each re-attach click listeners with a duplicated loop.
- **Bug:** starring a card inside the favorites overlay only toggles the overlay's copy of the star. The matching card in the main panel keeps its lit star. Two DOM copies of one entry share no state.

Fix: one click listener on `#panels`. `closest('.favorite-btn')` toggles the favorite and updates every star with the same `data-key`. Otherwise `closest('.card, .phrase-card')` calls `handleCardClick`. This removes `wireCards`, the `wireTabs` re-wiring, and both loops in the favorites functions.

### 3. Drive search visibility with a class, not inline styles

There are fourteen `style.display` writes. Cards and sections are hidden via inline style, panels via class. The reset code is duplicated in `filterCards('')` and in the global-search branch of `handleCardClick`.

Use a `.search-hidden` class on cards, sections and subsections. Reset becomes one `querySelectorAll('.search-hidden')` loop. Extract `resetSearch(panel)` and call it from both places.

### 4. Remove the repeated localStorage boilerplate

The same `try { localStorage... } catch (e) {}` block appears five times (favorites, collapsedGroups, theme, pinyin, lang). Extract:

```js
const store = {
  get(k, fallback) { try { return localStorage.getItem(k) ?? fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
function persistedSet(key) { /* Set backed by store, with toggle() */ }
```

Favorites and collapsedGroups become two lines each.

### 5. Unify section rendering

`renderPanels` contains an inline third section renderer for app cards that duplicates `renderSection`. Dispatch on `tab.cardClass` through a map:

```js
const CARD = {
  'card':        { render: renderCard,    grid: 'grid' },
  'phrase-card': { render: renderCard,    grid: 'phrase-grid' },
  'app-card':    { render: renderAppCard, grid: 'app-grid' },
};
```

Then `renderSection(sec, tab)` is the single path and the `fieldPrefix` / `gridClass` helpers go away. The condition `cardClass === 'app-card' && tab.intro` dispatches on the wrong key; `intro` should be an optional field on any tab.

### 6. Extract the transient-state reset

`synth.cancel()` + strip `.speaking` + strip `.revealed` + scroll to top appears in `switchToTab`, `handleCardClick` and `setLang`. Extract `resetTransient()`.

### 7. Content schema leaks presentation

`cardClass` stores a CSS classname in data. Rename it to `type: "vocab" | "phrase" | "app"` and let the renderer map types to classes. The visa tab uses `app-card` but is not an app. Low urgency, but the schema is the contract with future content.

### 8. Add a content validator

There are no tests. A cheap script, `scripts/check-content.py`, should verify: every `label` / `title` / `meaning` / `description` has both `en` and `it`; `pinyin` contains no digits; no duplicate `hanzi` within a tab (favorites are keyed `tabId:hanzi`); tab `id` values are unique. Run it before committing content changes.

### Minor

- Load-error strings are hardcoded EN/IT inside the fetch `catch`. Move them to `CHROME`.
- The install hint uses inline `style=` and `onclick=` in the HTML. Move that to JS.
- `[data-theme="dark"]` sits at line 850 of `style.css`. Move it next to `:root`.
- Two `@media (max-width: 699px)` blocks (lines 398 and 1106). Merge them.
- `sw.js` returns `index.html` for any failed fetch, including `content.json`, which produces a JSON parse error instead of the load-error message. Only fall back to `index.html` for navigation requests (`req.mode === 'navigate'`).
- Favorites are keyed `tabId:hanzi`. No duplicates exist today; the validator in item 8 guards it.

### Suggested order

Items 2, 3 and 6 first (small, fix a real bug), then 1, then 4 and 5, then 8.

---

## 3. Content ideas

- Emergency numbers (110 / 120 / 119)
- Show mode (fullscreen hanzi to hold up to someone)
- Slow TTS on long-press (0.7× rate)
- Quiz shuffle
- Search-result highlight after navigating to a tab
