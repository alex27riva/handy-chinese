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

Reviewed 2026-09-13. App is healthy and well documented; the script has been split into ES modules under `js/` (v0.16.1); clicks are delegated and search state is class-driven (v0.16.2), storage goes through `store` (v0.16.3); the remaining items are within those modules. Ranked, highest impact first.

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

### 7. Content schema leaks presentation

`cardClass` stores a CSS classname in data. Rename it to `type: "vocab" | "phrase" | "app"` and let the renderer map types to classes. The visa tab uses `app-card` but is not an app. Low urgency, but the schema is the contract with future content.

### 8. Add a content validator

There are no tests. A cheap script, `scripts/check-content.py`, should verify: every `label` / `title` / `meaning` / `description` has both `en` and `it`; `pinyin` contains no digits; no duplicate `hanzi` within a tab (favorites are keyed `tabId:hanzi`); tab `id` values are unique. Run it before committing content changes.

### Minor

- The install hint uses inline `style=` and `onclick=` in the HTML. Move that to JS.
- `[data-theme="dark"]` sits at line 850 of `style.css`. Move it next to `:root`.
- Two `@media (max-width: 699px)` blocks (lines 398 and 1106). Merge them.
- Favorites are keyed `tabId:hanzi`. No duplicates exist today; the validator in item 8 guards it.

### Suggested order

Item 5, then 8.

---

## 3. Content ideas

- Emergency numbers (110 / 120 / 119)
- Show mode (fullscreen hanzi to hold up to someone)
- Slow TTS on long-press (0.7× rate)
- Quiz shuffle
- Search-result highlight after navigating to a tab
