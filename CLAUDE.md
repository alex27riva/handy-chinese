# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Offline-capable PWA for Chinese travel vocabulary and phrases. Installable on iOS (Safari → Add to Home Screen) and Android (Chrome install prompt via manifest). No build system, no dependencies, no tests.

Core files:

- `index.html` — app shell (markup, renderer JS). Contains no vocabulary data.
- `style.css` — all styles. CSS custom properties in `:root` drive theming.
- `content.json` — all vocabulary and phrase data (tabs → sections → entries).
- `sw.js` — service worker providing cache-first offline support.
- `manifest.json` — Web App Manifest for Android PWA install prompt.
- `icon.svg` — app icon (SVG, referenced by manifest and precached by SW).

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
A tab has **either** `sections` (flat: section → entries) **or** `subsections` (nested: subsection → sections → entries). The renderer dispatches on which key is present. Subsection titles render as large hanzi headers with a red-accent underline; use them to group related sections under a shared theme (e.g. vocab is grouped into `App UI` and `Food`).
- `cardClass` is either `"card"` (vocabulary style — compact, no accent) or `"phrase-card"` (phrase style — wider, gold left border). The renderer derives everything else from this: field classnames get a `phrase-` prefix for phrase cards, and the grid container becomes `.phrase-grid` vs `.grid`.
- Tone marks in `pinyin` must be real diacritics (`nǐ hǎo`), not numbered (`ni3 hao3`).
- `hanzi` and `pinyin` are language-neutral (plain strings). **Every other translatable field** — `tab.label`, `subsection.title`, `section.title`, `entry.meaning` — is a `{en, it}` object. The `t()` helper in `index.html` resolves the active language; plain strings are accepted as a legacy fallback.
- To add a tab, subsection, section, or entry: edit `content.json` with both `en` and `it` translations, and bump `CACHE` in `sw.js` so installed users pick it up.

### Language switch
Top-right fixed toggle (EN / IT). State is module-level (`currentLang` in the script block), persisted to `localStorage.lang`, and initialized from `navigator.language` on first visit (Italian browsers default to IT). Flipping the switch calls `rerenderContent()` (wipes and rebuilds tabs + panels using the new language) and `applyChrome()` (updates static UI strings via `data-i18n` / `data-i18n-html` attributes against the `CHROME` map in the script). To add UI chrome text, add a key to `CHROME` and tag the element with `data-i18n="key"` (textContent) or `data-i18n-html="key"` (innerHTML — use for strings containing inline `<strong>` etc).

### Dark mode
Top-left fixed button (☾ / ☀︎). State is module-level (`currentTheme`), persisted to `localStorage.theme`, initialized from `localStorage` first then `prefers-color-scheme` fallback. Applied synchronously before render via `document.documentElement.dataset.theme = currentTheme` to prevent flash. All colors are CSS custom properties in `:root`; the `[data-theme="dark"]` block in `style.css` overrides them. No JS re-render needed on toggle — CSS handles everything. `setTheme(theme)` is the toggle function.

### Collapsible sections
Vocab subsections (App UI / Food / Signs) and phrase sections collapse on tap. State lives in `localStorage.collapsedGroups` as a JSON array of `"{tabId}:{titleInEnglish}"` keys — English title used as stable ID so state survives language switch. `isCollapsed(tabId, titleObj)` and `toggleCollapse(tabId, titleObj)` manage state. The `.is-collapsed` class drives hide/show via CSS (`subsection.is-collapsed > .section { display:none }` and `section.is-collapsed > .grid { display:none }`). Chevron SVG rotates 90° when collapsed. During search, the `.search-active` class on the active panel overrides collapse CSS so matches are always visible.

### Favorites
A star button (top-left of every card, mirroring the top-right speaker) toggles an entry into a dedicated **Favorites** tab (`收藏`, rightmost). State lives in `localStorage.favorites` as a JSON array of `"{tabId}:{hanzi}"` keys — so `菜单` in `vocab` and `菜单` in `phrases` star independently. The Favorites tab and panel are **renderer-injected** (not present in `content.json`): `renderTabs` appends the tab button, `renderPanels` appends the panel via `renderFavoritesPanel()`. The empty-state and tab-label strings live in `CHROME` (`favoritesLabel`, `favoritesEmpty`). Toggling a star calls `refreshFavoritesPanel()` to rebuild just `#tab-favorites` in place, so starring from any tab (including from within Favorites) keeps the view consistent. Star clicks use `stopPropagation()` so TTS doesn't fire.

### Hide Pinyin
Toolbar button (拼). Toggles `data-pinyin="hidden"` on `<html>`; CSS hides `.pinyin`, `.phrase-pinyin`, `.app-pinyin` globally with `display:none`. State is `pinyinHidden` (bool), persisted to `localStorage.pinyinHidden`. Applied synchronously before render to prevent flash. `setPinyinMode(hidden)` is the toggle function. Button gets `.active` class when hiding.

### Quiz mode
Toolbar button (？). Toggles `data-quiz="on"` on `<html>`. In quiz mode, `.pinyin` and `.meaning` fields on unrevealed cards use `visibility:hidden` (not `display:none`) — preserves card height so layout doesn't shift. Tapping a card reveals it (adds `.revealed` class) and speaks the hanzi; tapping again hides and cancels TTS. State is `quizMode` (bool), **not persisted** — intentionally resets on each session. `setQuizMode(on)` clears all `.revealed` cards on toggle. `handleCardClick(card)` is the shared click handler used by both `wireCards()` and the favorites panel — it dispatches on `quizMode`.

### Tab navigation
`switchToTab(targetId)` is the single function for all tab switches (clicks and swipes). It updates `.active` on tabs + panels, cancels TTS, clears `.speaking` / `.revealed`, resets search input, and scrolls to top.

`wireTabs()` wires tab button clicks to `switchToTab`. `wireSwipe()` adds passive `touchstart`/`touchend` listeners on `#panels`: fires `switchToTab` on horizontal swipe ≥50px where `|dx| > |dy|` (so vertical scroll is never hijacked). `wireSwipe()` attaches once to the persistent `#panels` div and survives `rerenderContent()` — it is NOT called again on language switch.

### TTS
`speak(text, card)` via `window.speechSynthesis`. Voice selection prefers `zh-CN`, falls back to any `zh-*`. Rate 0.85. `synth.cancel()` runs on tab switch and before each utterance to prevent overlap. The `.speaking` class is the visual-feedback hook.

### Offline / PWA
- `sw.js` precaches `./`, `./index.html`, `./content.json`, `./style.css`, `./manifest.json`, `./icon.svg` on install and serves cache-first with a network fallback that also populates the cache. Bump the `CACHE` constant when shipping a change you want users to pick up — otherwise the old version stays cached indefinitely.
- iOS install uses `apple-mobile-web-app-*` meta tags and an inline SVG data-URI `apple-touch-icon`. Android install uses `manifest.json` (linked via `<link rel="manifest">`), which provides name, theme color, display mode, and `icon.svg`. The icon is SVG-only (`"purpose": "any"`) — modern Chrome supports it, but older Android may not render it as an adaptive icon.
- Install hint is platform-aware: iOS shows Safari share instructions; Android shows browser menu / Install button instructions. Detection uses UA sniffing (`/android/i`). Both hints share the same dismissible banner (`localStorage.hintDismissed`).
- `@media (display-mode: standalone)` hides the install hint when launched from the home screen.

### localStorage keys
| Key | Format | Purpose |
|-----|--------|---------|
| `lang` | `'en'` \| `'it'` | Active language |
| `theme` | `'light'` \| `'dark'` | Active theme |
| `favorites` | JSON array of `"tabId:hanzi"` | Starred entries |
| `collapsedGroups` | JSON array of `"tabId:titleEn"` | Collapsed sections |
| `hintDismissed` | `'1'` | Install banner dismissed |
| `pinyinHidden` | `'1'` \| `'0'` | Hide pinyin romanization |

## Editing conventions

- **Content edits go in `content.json`.** Do not reintroduce hardcoded card markup in `index.html`.
- **Theme colors go in `style.css` `:root` and `[data-theme="dark"]`.** All color values must be CSS custom properties — no hardcoded hex/rgba in rules.
- No external fonts or network assets. Fonts come from the system stacks defined in `:root` (`--font-hanzi`, `--font-mono`, `--font-serif`, `--font-sans`). Don't add `<link>` to Google Fonts etc.
- If you add a new static asset (e.g. an image, another JSON file), add its path to `ASSETS` in `sw.js` and bump `CACHE` so existing installs refetch.
- **When shipping any user-visible change**, bump the version string in `index.html` (e.g. `v0.7.0` → `v0.8.0`). It renders as `.app-version` in the bottom-right corner. Use semver loosely: patch for fixes/content, minor for new features.

## Future improvements

Rough priority order — high impact items first.

### Features
- **Cross-tab search** — current search only filters the active tab; a global search across all tabs would be significantly more useful
- **Slow TTS** — long-press a card to speak at 0.7× rate; critical for learning unfamiliar tones

### Content
- **Medical / hospital tab** — fever, allergy, pharmacy, emergency phrases; high value for travelers
- **Hotel check-in phrases** — currently missing from phrases tab

### Polish
- **Maskable icon** — add a PNG or SVG with `"purpose": "maskable"` to manifest for proper adaptive icons on Android
