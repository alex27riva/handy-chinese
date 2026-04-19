# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Offline-capable PWA for Chinese travel vocabulary and phrases. Designed to be installed on iOS via Safari → Add to Home Screen. No build system, no dependencies, no tests.

Three files make up the app:

- `index.html` — app shell (markup, inline CSS, renderer JS). Contains no vocabulary data.
- `content.json` — all vocabulary and phrase data (tabs → sections → entries).
- `sw.js` — service worker providing cache-first offline support.

## Running / previewing

There is no build step, but the app **must be served over HTTP(S)** — opening `index.html` via `file://` will break both the `fetch('./content.json')` call and the service worker. Quick local server:

```
python3 -m http.server
```

Then browse to `http://localhost:8000/`. For the install-to-home-screen flow and native `zh-CN` TTS voices, test on real iOS Safari — desktop browsers have different voice availability.

## Architecture

### Data flow
On load, `index.html` fetches `content.json` and renders the entire tabbed card UI from it. There is no static card markup in the HTML. The rendering pipeline is: `renderTabs()` + `renderPanels()` → `wireTabs()` → `wireCards()` (TTS click handlers).

### Content shape (`content.json`)
```
{ "tabs": [ { "id", "label": {en,it}, "hanziLabel", "cardClass",
              "sections" OR "subsections": [...] } ] }
```
A tab has **either** `sections` (flat: section → entries) **or** `subsections` (nested: subsection → sections → entries). The renderer dispatches on which key is present. Subsection titles render as large hanzi headers with a red-accent underline; use them to group related sections under a shared theme (e.g. vocab is grouped into `Apps` and `Food`).
- `cardClass` is either `"card"` (vocabulary style — compact, no accent) or `"phrase-card"` (phrase style — wider, gold left border). The renderer derives everything else from this: field classnames get a `phrase-` prefix for phrase cards, and the grid container becomes `.phrase-grid` vs `.grid`.
- Tone marks in `pinyin` must be real diacritics (`nǐ hǎo`), not numbered (`ni3 hao3`).
- `hanzi` and `pinyin` are language-neutral (plain strings). **Every other translatable field** — `tab.label`, `subsection.title`, `section.title`, `entry.meaning` — is a `{en, it}` object. The `t()` helper in `index.html` resolves the active language; plain strings are accepted as a legacy fallback.
- To add a tab, subsection, section, or entry: edit `content.json` with both `en` and `it` translations, and bump `CACHE` in `sw.js` so installed users pick it up.

### Language switch
Top-right fixed toggle (EN / IT). State is module-level (`currentLang` in the script block), persisted to `localStorage.lang`, and initialized from `navigator.language` on first visit (Italian browsers default to IT). Flipping the switch calls `rerenderContent()` (wipes and rebuilds tabs + panels using the new language) and `applyChrome()` (updates static UI strings via `data-i18n` / `data-i18n-html` attributes against the `CHROME` map in the script). To add UI chrome text, add a key to `CHROME` and tag the element with `data-i18n="key"` (textContent) or `data-i18n-html="key"` (innerHTML — use for strings containing inline `<strong>` etc).

### Favorites
A star button (top-left of every card, mirroring the top-right speaker) toggles an entry into a dedicated **Favorites** tab (`收藏`, rightmost). State lives in `localStorage.favorites` as a JSON array of `"{tabId}:{hanzi}"` keys — so `菜单` in `vocab` and `菜单` in `phrases` star independently. The Favorites tab and panel are **renderer-injected** (not present in `content.json`): `renderTabs` appends the tab button, `renderPanels` appends the panel via `renderFavoritesPanel()`. The empty-state and tab-label strings live in `CHROME` (`favoritesLabel`, `favoritesEmpty`). Toggling a star calls `refreshFavoritesPanel()` to rebuild just `#tab-favorites` in place, so starring from any tab (including from within Favorites) keeps the view consistent. Star clicks use `stopPropagation()` so TTS doesn't fire.

### TTS
One generic click handler on `.card, .phrase-card` reads `.hanzi` or `.phrase-hanzi` and speaks it via `window.speechSynthesis`. Voice selection prefers `zh-CN`, falls back to any `zh-*`. `synth.cancel()` runs on tab switch and before each utterance to prevent overlap. The `.speaking` class is the visual-feedback hook.

### Offline / PWA
- `sw.js` precaches `./`, `./index.html`, `./content.json` on install and serves cache-first with a network fallback that also populates the cache. Bump the `CACHE` constant (`chinese-travel-v1` → `v2`) when shipping a change you want users to pick up — otherwise the old version stays cached indefinitely.
- iOS install uses the `apple-mobile-web-app-*` meta tags and inline SVG data-URI icons. No `manifest.json` — iOS doesn't need one, and the app isn't targeting Android install.
- `@media (display-mode: standalone)` hides the install hint when launched from the home screen; the hint is also dismissible with `localStorage.hintDismissed`.

## Editing conventions

- **Content edits go in `content.json`.** Do not reintroduce hardcoded card markup in `index.html`.
- No external fonts or network assets. Fonts come from the system stacks defined in `:root` (`--font-hanzi`, `--font-mono`, `--font-serif`, `--font-sans`). Don't add `<link>` to Google Fonts etc.
- If you add a new static asset (e.g. an image, another JSON file), add its path to `ASSETS` in `sw.js` and bump `CACHE` so existing installs refetch.
