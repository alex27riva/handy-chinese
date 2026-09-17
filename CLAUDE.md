# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Offline-capable PWA for Chinese travel vocabulary and phrases. Installable on iOS (Safari → Add to Home Screen) and Android (Chrome install prompt via manifest). No build system, no dependencies. The only check is `scripts/check-content.py` (see Running / previewing).

Core files:

- `index.html` — app shell (markup only, plus a tiny inline pre-paint script for theme/pinyin). Contains no vocabulary data and no app logic.
- `js/` — app logic as ES modules, loaded via `<script type="module" src="./js/app.js">`. No bundler; the browser resolves the imports. Adding a module means adding it to `ASSETS` in `sw.js`.
  - `app.js` — entry point: install hint, button wiring, content fetch, service-worker registration.
  - `settings.js` — persisted user state (theme, lang, pinyin, quiz, favorites, collapsed groups). Exports `store` (`get(key, fallback)` / `set(key, value)`, swallows `localStorage` exceptions); `persistedSet(key)` backs the two Set-shaped keys. **All `localStorage` access goes through `store`** — the only exceptions are the pre-paint script in `index.html` `<head>` (runs before modules) and the inline close-hint handler.
  - `i18n.js` — `CHROME` string map, `t()`, `applyChrome()`.
  - `render.js` — builds tabs, panels, cards and the favorites overlay from `content.json`; owns `contentData` and `rerenderContent()`.
  - `search.js` — `foldSearch()`, `filterCards()`.
  - `tabs.js` — `setActiveTab()`, `switchToTab()`, `resetTransient()`, tab clicks (delegated on `#tabs`), swipe.
  - `cards.js` — `handleCardClick()`, `wirePanelClicks()` (one delegated click listener on `#panels` for cards, stars and collapsible titles), keyboard activation, long-press copy.
  - `tts.js` — voice selection and `speak()`.
  - `toast.js` — `showToast()`.
  - `custom.js` — user's own phrases (我的 tab): `localStorage.customEntries` load/add/remove/export, the add-phrase form sheet, JSON import, the per-tab action bar, and `customTab()` (the synthetic tab `render.js` appends).
- `style.css` — all styles. CSS custom properties in `:root` drive theming.
- `content.json` — all vocabulary and phrase data (tabs → sections → entries).
- `sw.js` — service worker providing cache-first offline support.
- `manifest.json` — Web App Manifest for Android PWA install prompt.
- `CNAME` — custom domain for GitHub Pages (`handyhanzi.app`). Repo root, one line, no scheme. Not a runtime asset: keep it out of `ASSETS` in `sw.js`.
- `icon.svg` — app icon (SVG, `purpose: any`, referenced by manifest and precached by SW).
- `icon-maskable.svg` — same seal, full-bleed square with the glyph kept inside the central 80% safe zone; `purpose: maskable` in the manifest so Android adaptive icons crop it cleanly.
- `apple-touch-icon.png` — 180×180 PNG home-screen icon for iOS (Safari ignores SVG `apple-touch-icon`). Square, no rounded corners — iOS applies its own mask. Regenerate from `icon.svg` with `rx="0"` if the icon changes.

## Running / previewing

There is no build step, but the app **must be served over HTTP(S)** — opening `index.html` via `file://` will break both the `fetch('./content.json')` call and the service worker. Quick local server:

```
python3 -m http.server
```

Then browse to `http://localhost:8000/`.

**Content check.** `python3 scripts/check-content.py` validates `content.json` (schema, `{en, it}` completeness, pinyin diacritics, duplicate hanzi per tab), that `sw.js` `ASSETS` lists every `js/*.js` file, and that every `CHROME` key has both languages. Run it after any content or module change; it is also wired as a pre-commit hook — enable once per clone with `git config core.hooksPath .githooks`. For the install-to-home-screen flow and native `zh-CN` TTS voices, test on real iOS Safari — desktop browsers have different voice availability.

## Architecture

### Data flow
On load, `index.html` fetches `content.json` and renders the entire tabbed card UI from it. There is no static card markup in the HTML. The rendering pipeline is: `renderTabs()` + `renderPanels()`. **No per-element listeners:** every click / key / pointer handler is delegated once, at boot, on the persistent `#tabs` and `#panels` containers (`wireTabs`, `wirePanelClicks`, `wireCardKeys`, `wireSwipe`, `wireLongPress` in `app.js`), so `rerenderContent()` only rebuilds DOM and never re-wires.

### Content shape (`content.json`)
```
{ "tabs": [ { "id", "label": {en,it}, "hanziLabel", "type",
              "sections" OR "subsections": [...] } ] }
```
A tab has **either** `sections` (flat: section → entries) **or** `subsections` (nested: subsection → sections → entries). The renderer dispatches on which key is present. Subsection titles render as large hanzi headers with a red-accent underline; use them to group related sections under a shared theme (e.g. vocab is grouped into `App UI`, `Food`, `Signs`, `Numbers` and `Countries`).
- `type` is `"vocab"` (compact card, no accent), `"phrase"` (wider card, gold left border) or `"app"` (icon + name + description, no star / TTS). Content never names CSS classes: `type` is the key into `CARD_KIND` in `js/render.js`, which holds the card renderer, the card's CSS class (`.card` / `.phrase-card` / `.app-card`), the grid class, the field-class prefix and whether flat sections of that kind collapse. `renderSection(sec, tab)` is the single path for every section; to add a card style, add one `CARD_KIND` entry plus its CSS.
- `intro` (optional `{en, it}` on any tab) renders a lead paragraph (`.app-intro`) above the sections.
- App entries show `icon` (an emoji) in the `.app-icon` box; an optional `iconSrc` (a precached image path, e.g. `./icon.svg`) renders an `<img>` there instead and takes precedence.
- Tone marks in `pinyin` must be real diacritics (`nǐ hǎo`), not numbered (`ni3 hao3`).
- `hanzi` and `pinyin` are language-neutral (plain strings). **Every other translatable field** — `tab.label`, `subsection.title`, `section.title`, `entry.meaning` — is a `{en, it}` object. The `t()` helper in `js/i18n.js` resolves the active language; plain strings are accepted as a legacy fallback.
- To add a tab, subsection, section, or entry: edit `content.json` with both `en` and `it` translations, run `python3 scripts/check-content.py`, and bump `CACHE` in `sw.js` so installed users pick it up.

### Language switch
EN / IT toggle, absolutely positioned at the top-right of `<header>` (scrolls away with it; not fixed). State is module-level (`currentLang` in `js/settings.js`, changed only via `setCurrentLang()`), persisted to `localStorage.lang`, and initialized from `navigator.language` on first visit (Italian browsers default to IT). Flipping the switch calls `rerenderContent()` (wipes and rebuilds tabs + panels using the new language) and `applyChrome()` (updates static UI strings via `data-i18n` / `data-i18n-html` attributes against the `CHROME` map in `js/i18n.js`). To add UI chrome text, add a key to `CHROME` and tag the element with `data-i18n="key"` (textContent) or `data-i18n-html="key"` (innerHTML — use for strings containing inline `<strong>` etc).

### Dark mode
☾ / ☀︎ button, absolutely positioned at the top-left of `<header>` (scrolls away with it; not fixed). State is module-level (`currentTheme`), persisted to `localStorage.theme`, initialized from `localStorage` first then `prefers-color-scheme` fallback. Applied before first paint by the inline script in `<head>` of `index.html` (module scripts are deferred, so `js/settings.js` re-applies it but cannot be first). The detection logic is duplicated in those two places on purpose; keep them in sync. All colors are CSS custom properties in `:root`; the `[data-theme="dark"]` block in `style.css` overrides them. No JS re-render needed on toggle — CSS handles everything. `setTheme(theme)` is the toggle function; it also calls `syncThemeColor()`, which copies the computed `--surface` into `<meta name="theme-color">` so the Android status bar / iOS Safari tint follows the page background.

**Token layers.** `:root` holds a *raw palette* (`--ink`, `--paper`, `--red`, `--gold`, `--muted`, `--border`, `--card-bg`) and a *semantic layer* built on it: `--text`, `--text-2` (secondary copy, darker than `--muted` for contrast), `--icon` (resting glyphs), `--surface`, `--surface-2` (cards/controls), `--surface-highlight` (inset top edge on cards, transparent in light), `--line`, `--accent` (red), `--accent-soft`, `--accent-2` (gold), `--accent-2-soft`, `--focus-ring`. **Component rules reference only semantic tokens.** The dark block overrides raw values plus the few semantic tokens that need their own dark value (`--text-2`, `--surface-highlight`, `--accent-soft`, `--accent-2-soft`). When adding a color: pick a semantic token; add a new one to both blocks if none fits; never write hex/rgba in a component rule.

### Header, sticky toolbar, about popover
Header is deliberately minimal: red rule, `h1`, one subtitle. The `.toolbar` (search + ☆ 拼 ? i buttons) is `position: sticky; top: 0` with a solid `--paper` background and hairline bottom border, so it stays reachable while scrolling; under 900px it bleeds edge-to-edge via negative side margins. The search pill fills the remaining width. The **i** button (`#aboutBtn`) toggles `#aboutPanel`, an absolutely-positioned popover inside the toolbar holding the name explanation (`CHROME.aboutTagline`) and gesture tips (`CHROME.aboutTips`, HTML list via `data-i18n-html`). `setAbout(open)` manages `hidden`, `.active`, `aria-expanded`; outside click and Escape close it. z-order: toolbar 120 < bottom tab bar 150 < toast 200 < favorites overlay 1000.

### Collapsible sections
Vocab subsections (App UI / Food / Signs / Numbers / Countries) and phrase sections collapse on tap. State lives in `localStorage.collapsedGroups` as a JSON array of `"{tabId}:{titleInEnglish}"` keys — English title used as stable ID so state survives language switch. `collapseKey(tabId, titleObj)`, `isCollapsed(tabId, titleObj)` and `toggleCollapse(key)` manage state. The renderer stamps `data-collapse-key` on collapsible titles; the delegated click handler in `cards.js` reads it, toggles the key and flips `.is-collapsed` on the title's parent. The `.is-collapsed` class drives hide/show via CSS (`subsection.is-collapsed > .section { display:none }` and `section.is-collapsed > .grid { display:none }`). Chevron SVG rotates 90° when collapsed. During search, the `.search-active` class is applied to panels (all panels in global search mode, active panel only otherwise), overriding collapse CSS so matches are always visible.

### Favorites
A star button (bottom-right of every card; the speaker icon sits top-right, both in a 2.9rem right gutter with 36px hit areas) toggles an entry into a **Favorites overlay** (`收藏`), opened by the toolbar star button (`#favBtn`). State lives in `localStorage.favorites` as a JSON array of `"{tabId}:{hanzi}"` keys — so `菜单` in `vocab` and `菜单` in `phrases` star independently. The overlay (`#favorites-overlay`, built by `renderFavoritesOverlay()`) is appended to `#panels` by `renderPanels()`; `showFavorites()` fills `#favorites-content` via `renderFavoritesContent()` and adds `.active` on the overlay plus `.fav-open` on `<body>` (scroll lock). `hideFavorites()` reverses it; clicking the backdrop or `.fav-close` closes. The empty-state string lives in `CHROME.favoritesEmpty`. Cards carry `data-tab` + `data-hanzi`, which together form the key. Star clicks are handled by the delegated listener in `cards.js`: it toggles the key, runs `syncStars()` (so the same entry's star in the main panel and in the overlay always agree) and `refreshFavoritesPanel()` (rebuilds `#favorites-content` in place). The handler returns before the card branch, so a star tap never triggers TTS. `wireSwipe()` ignores gestures while `body.fav-open` is set, so swiping inside the overlay does not change the tab underneath.

### Custom phrases (我的 tab)
The last tab is synthetic: `allTabs()` in `js/render.js` returns `contentData.tabs` plus `customTab()` from `js/custom.js`, so `rerenderContent()` (now also the first render, called from `app.js` after the fetch) and the favorites overlay see it like any other tab. It is `type: "phrase"` with `custom: true`, id `my`, label `CHROME.customTabLabel`; entries come from `localStorage.customEntries` (JSON array of `{hanzi, pinyin, meaning, note}`, all plain strings; `pinyin` and `note` may be empty). `renderCard` skips empty `pinyin` / `note` divs and, for `custom` tabs, appends a `.remove-btn` (`data-custom-action="remove"`) that CSS shows only while the panel has `.editing`. `note` renders as `.phrase-note` (hidden in quiz mode like the meaning) and is part of the search index.

`renderPanels` puts `renderCustomBar()` (Add / Import / Export / Edit / Delete all) at the top of the panel and `renderCustomEmpty()` when there are no entries; `#panels.global-search .custom-bar` is hidden. All bar and card buttons carry `data-custom-action` and are handled by one delegated listener in `wireCustom()`; `wirePanelClicks()` ignores any `<button>` that is not a star, so they never trigger TTS. Every change calls `rerenderContent()`; edit mode is re-applied after a single removal. "Delete all" is a two-tap confirm (no `confirm()` dialog).

**Add** opens `#addSheet` (a `<form>`, static markup in `index.html`, strings via `data-i18n*`; `data-i18n-placeholder` is handled by `applyChrome()`) with four inputs: hanzi (required, must contain a CJK character), pinyin (optional), meaning (required), note (optional). Submit (button or Enter) adds one entry, toasts, rerenders and clears the fields but keeps the sheet open, so several phrases can be typed in a row; duplicates by hanzi are refused with a toast. **Import** opens the hidden `#importFile` picker (JSON only): `parseImport()` accepts the export shape (`{entries: [...]}`) or a bare array; `meaning` may be `{en, it}` and is resolved with `t()`. Entries without a CJK hanzi or a meaning are dropped and duplicates (against existing and within the file) skipped; the toast reports both counts. **Export** writes `handy_YYYYMMDD_HHMMSS.json` as `{app, format, exported, entries}`: on iOS it goes through `navigator.share` with a file (installed PWAs ignore `<a download>`), elsewhere through a Blob link. `body.sheet-open` locks scroll and, like `fav-open`, disables swipe.

### Pleco lookup
On iOS / Android (`platform.mobile` in `js/settings.js`, the shared UA sniff also used by the install hint and export) every vocab / phrase card gets a `.pleco-btn` anchor (open-book icon, mid-right between speaker and star) whose `href` comes from `plecoUrl(hanzi)` in `js/render.js`: `plecoapi://x-callback-url/s?q=…` on iOS, an `intent://…#Intent;scheme=plecoapi;package=com.pleco.chinesesystem;S.browser_fallback_url=<Play Store>;end` URL on Android so Chrome offers the store when Pleco is missing (iOS has no fallback: Safari shows "cannot open the page"). Desktop renders no link. The delegated card handlers in `cards.js` ignore taps on `button, a`, so the link never triggers TTS or copy.

### Hide Pinyin
Toolbar button (拼). Toggles `data-pinyin="hidden"` on `<html>`; CSS hides `.pinyin`, `.phrase-pinyin`, `.app-pinyin` globally with `display:none`. State is `pinyinHidden` (bool), persisted to `localStorage.pinyinHidden`. Applied before first paint by the same inline `<head>` script as the theme. `setPinyinMode(hidden)` is the toggle function. Button gets `.active` class when hiding.

### Search
Toolbar input (`#searchInput`). `filterCards(query)` is the core function. Both the per-card index (`data-search`, built in `renderCard` / `renderAppCard`) and the query go through `foldSearch()`: NFD-normalize, strip combining marks (so `nǐ hǎo` → `ni hao`), lowercase, remove all whitespace. Typing `ni hao`, `nihao` or `nǐ hǎo` all match. When query is non-empty it enters **global search mode**: adds `global-search` to `#panels`, applies `search-active` to every `.tab-panel` (forcing collapsed sections open via existing CSS), adds `.search-hidden` to non-matching cards and to sections/subsections with no visible cards (CSS `#panels .search-hidden { display:none }`), and sets `no-match` on panels with zero results (CSS hides them entirely). When query is cleared `resetSearch(panel)` strips `.search-hidden` / `.search-active` / `.no-match` from every panel and the normal single-active-tab view resumes. Never hide search results with inline styles; `resetSearch` is the single undo.

A `✕` clear button (`#searchClear`) sits inside the search pill — hidden via `hidden` attribute when input is empty, shown when non-empty. Click clears input and calls `filterCards('')`.

Each panel has a `.panel-search-label` injected as its first child by `renderPanels()`. Hidden normally; `#panels.global-search .panel-search-label { display: block }` reveals it to label each result group with the tab name. Labels re-render automatically on language switch because `rerenderContent()` rebuilds panels fresh.

Cards carry `data-tab="{tabId}"` (set in `renderCard` and `renderAppCard`). In global search mode, `handleCardClick` detects `#panels.global-search`, switches to the clicked card's tab (updates `.active` on tabs/panels), exits global mode, calls `resetSearch` on the non-active panels plus `resetTransient()`, and leaves the target panel in single-tab filtered view — user lands on the right tab showing only query matches. TTS fires after navigation as normal.

`switchToTab()` also clears global search when called via tab button click or swipe.

CSS state driven by:
- `#panels.global-search` — all `.tab-panel` visible; `.tab-panel.no-match` hidden
- `.search-active` on panel — collapsed sections forced open
- `.search-hidden` on card / section / subsection — hidden (only `filterCards` sets it, only `resetSearch` clears it)
- `.panel-search-label` — hidden by default, shown inside `#panels.global-search`

### Quiz mode
Toolbar button (？). Toggles `data-quiz="on"` on `<html>`. In quiz mode, `.pinyin` and `.meaning` fields on unrevealed cards use `visibility:hidden` (not `display:none`) — preserves card height so layout doesn't shift. Tapping a card reveals it (adds `.revealed` class) and speaks the hanzi; tapping again hides and cancels TTS. Unrevealed cards also get a dashed "tap to reveal" line via `::after`, whose label comes from the `--quiz-hint` custom property — `applyChrome()` sets it from `CHROME.quizHint` so it follows the EN/IT switch. State is `quizMode` (bool), **not persisted** — intentionally resets on each session. `setQuizMode(on)` clears all `.revealed` cards on toggle. `handleCardClick(card)` is the shared click handler reached via the delegated `wirePanelClicks()` listener (covers panels and the favorites overlay) and via `wireCardKeys()` — it dispatches first on global search (navigate to tab), then on `quizMode`.

### Copy hanzi (long-press)
Holding any card (`.card`, `.phrase-card`, `.app-card`) for 500ms copies its hanzi to the clipboard. `wireLongPress()` attaches pointer listeners once to the persistent `#panels` (delegated, so it survives `rerenderContent()` and covers the favorites overlay). **Two-phase on purpose:** the long-press timer only *arms* the card (`.copy-armed`, gold border, vibrate); the clipboard write runs synchronously in the `pointerup` handler. iOS Safari rejects `clipboard.writeText` (and `execCommand('copy')`) unless called inside a user-activation event — a `setTimeout` callback does not count — so never move the write back into the timer. Arming is cancelled on `pointercancel` / `pointerleave` or if the pointer moves >10px (scroll). Presses starting on a `<button>` (star) are ignored. On release `card.dataset.longPressed` is set, which `handleCardClick` consumes to swallow the click that follows — so TTS does not fire after a copy. `copyText(text)` tries `navigator.clipboard.writeText`, falling back to `execCommandCopy()` on rejection. Feedback: `.copied` class (brief scale), `navigator.vibrate(30)` where supported, and `showToast()` (`#toast`, strings `CHROME.copied` / `CHROME.copyFailed`). `contextmenu` is suppressed on cards so desktop right-click / Android long-press menus don't interfere.

### Accessibility
Cards rendered by `renderCard` are `div`s with `role="button"` and `tabIndex = 0`; `wireCardKeys()` delegates a `keydown` listener on the persistent `#panels` so Enter / Space call `handleCardClick` (Space is `preventDefault`ed so it doesn't scroll). App cards are not interactive and deliberately get no button role. `setActiveTab(targetId)` is the **single owner of active-tab DOM state** — it flips `.active` on tabs and panels and keeps `aria-selected` in sync; `switchToTab`, `rerenderContent` and the global-search branch of `handleCardClick` all go through it, so the two can never drift. Tabs carry `id="tabbtn-{id}"` + `aria-controls`; panels carry `role="tabpanel"` + `aria-labelledby`. Escape closes the favorites overlay (and, separately, the about popover). Every hanzi element (`.hanzi`, `.phrase-hanzi`, `.app-hanzi`, `.tab-hanzi`, and the static 汉 / 拼 / 收藏) carries `lang="zh-CN"` so Android doesn't render Japanese glyph variants for shared characters. `:focus-visible` draws a 2px `--accent` outline on cards, tabs and toolbar buttons.

### Tab navigation
`switchToTab(targetId)` is the single function for all tab switches (clicks and swipes). It updates `.active` on tabs + panels, calls `resetTransient()` (cancel TTS, clear `.speaking` / `.revealed` — also used by `setLang` and the global-search branch of `handleCardClick`), clears search input (and resets global search state if active), and scrolls to top.

**Mobile bottom bar.** Under 700px wide, `.tabs` is restyled (CSS only, `@media (max-width: 699px)` in `style.css`) into a fixed bottom tab bar: full width, `--card-bg` background, hairline top border, safe-area bottom padding. Same DOM, same `wireTabs()` / `switchToTab()`; nothing in JS knows about the breakpoint. Active tab = red hanzi + bold ink label, no fill, and the desktop underline (`.tab.active::after`) is hidden. `body` gets extra bottom padding so content clears the bar, and `.app-version` / `.toast` move up above it. The bar slides off-screen while `#searchInput` is focused (`body:has(...)`) so the iOS keyboard doesn't push it over results. At ≥700px the top strip shows the active tab as ink text + red hanzi + a 2px red underline (`.tab.active::after`), no solid fill.

`wireTabs()` delegates tab button clicks on `#tabs` to `switchToTab`. `wireSwipe()` adds passive `touchstart`/`touchend` listeners on `#panels`: fires `switchToTab` on horizontal swipe ≥50px where `|dx| > |dy|` (so vertical scroll is never hijacked). `wireSwipe()` attaches once to the persistent `#panels` div and survives `rerenderContent()` — it is NOT called again on language switch.

### TTS
`speak(text, card)` via `window.speechSynthesis`. Voice selection prefers `zh-CN`, falls back to any `zh-*`. Rate 0.85. **Missing-voice hint:** on the first tap, if the device reports voices but none is `zh-*`, `maybeVoiceHint()` shows a long-form toast (`CHROME.noZhVoice`, 6s, `.toast-long` wraps instead of truncating) pointing at the iOS / Android settings screens, then sets `localStorage.voiceHintShown` so it never repeats. Devices reporting zero voices (desktop Linux, headless) get no hint because nothing can be concluded. **Cancelling.** `cancelSpeech()` in `js/tts.js` is the single cancel path (tab switch in `tabs.js`, re-tap in quiz mode in `cards.js`, and inside `speak()` when something is still speaking); `synth` itself is module-private. It stamps the cancel time, because Firefox (bug 1522074) silently drops a `speak()` issued right after a `cancel()` — so on `platform.firefox` `speak()` defers the utterance until 300ms after the last cancel, while every other engine speaks synchronously (iOS requires the call to stay inside the tap). The utterance is also held in `currentUtter` so GC cannot collect it mid-sentence. **iOS silent switch.** iOS puts the page in the `ambient` audio session, which the ring/silent switch mutes — speech included, so cards were silent unless the switch was flipped. `unlockAudio()` runs on the first `speak()` (still inside the user gesture) and promotes the session to `playback` via `navigator.audioSession` (Safari 16.4+), falling back on older iOS to a silent looping `<audio>` built at runtime by `silentWavUrl()` — no asset, nothing to precache. iOS only; desktop and Android are untouched. The `.speaking` class is the visual-feedback hook.

### Offline / PWA
- `sw.js` precaches `./`, `./index.html`, `./content.json`, `./style.css`, `./manifest.json`, `./icon.svg`, `./apple-touch-icon.png` and every `./js/*.js` module on install (with `cache: 'reload'` requests, so the browser's HTTP cache can never hand a new worker a stale module next to fresh ones) and serves cache-first with a network fallback that also populates the cache. When both cache and network fail, only navigation requests fall back to `./index.html`; a failed module or JSON request rejects instead of returning HTML. Bump the `CACHE` constant when shipping a change you want users to pick up — otherwise the old version stays cached indefinitely. `CACHE` doubles as the app version string (see Editing conventions); `showAppVersion()` in `js/app.js` reads it via `caches.keys()` at load, on `navigator.serviceWorker.ready`, and on `controllerchange`.
- iOS install uses `apple-mobile-web-app-*` meta tags and `apple-touch-icon.png` (must be PNG — iOS ignores SVG here and would fall back to a page screenshot). Android install uses `manifest.json` (linked via `<link rel="manifest">`), which provides name, theme color, display mode, and `icon.svg`. Icons are SVG-only: `icon.svg` (`purpose: any`) plus `icon-maskable.svg` (`purpose: maskable`) for adaptive icons; modern Chrome supports both, very old Android may not render SVG manifest icons.
- Install hint is platform-aware: iOS shows Safari share instructions; Android shows browser menu / Install button instructions. Detection uses UA sniffing (`/android/i`). Both hints share the same dismissible banner (`localStorage.hintDismissed`). The banner and the Install button start with the `hidden` attribute in the markup; `js/app.js` reveals the banner only on iOS/Android when not standalone/dismissed, and the button only after `beforeinstallprompt`. No inline `style=` / `onclick=` in `index.html`.
- `@media (display-mode: standalone)` hides the install hint when launched from the home screen.
- **Update prompt.** `sw.js` calls `skipWaiting()` + `clients.claim()`, so a new worker takes control of open pages as soon as it installs; the page then fires `controllerchange`. `js/app.js` listens for it and shows `#updateToast` ("New version ready · tap to reload", `CHROME.updateReady`) — tapping reloads. A `hadController` flag (true only if a worker already controlled the page at load) suppresses the toast on first install. The registration also calls `reg.update()` on `visibilitychange` → visible, so an installed app that was backgrounded re-checks `sw.js` when reopened. Net effect: bump `CACHE`, deploy, and users get the toast on their next foregrounding instead of silently running the old build.

### localStorage keys
| Key | Format | Purpose |
|-----|--------|---------|
| `lang` | `'en'` \| `'it'` | Active language |
| `theme` | `'light'` \| `'dark'` | Active theme |
| `favorites` | JSON array of `"tabId:hanzi"` | Starred entries |
| `collapsedGroups` | JSON array of `"tabId:titleEn"` | Collapsed sections |
| `hintDismissed` | `'1'` | Install banner dismissed |
| `pinyinHidden` | `'1'` \| `'0'` | Hide pinyin romanization |
| `voiceHintShown` | `'1'` | Missing-Chinese-voice toast already shown |
| `customEntries` | JSON array of `{hanzi, pinyin, meaning, note}` | User's own phrases (我的 tab) |

## Editing conventions

- **Content edits go in `content.json`.** Do not reintroduce hardcoded card markup in `index.html`.
- **Theme colors go in `style.css` `:root` and `[data-theme="dark"]`.** All color values must be CSS custom properties — no hardcoded hex/rgba in rules. Component rules use the semantic tokens (`--text`, `--surface-2`, `--line`, `--accent`…), never the raw palette names (`--ink`, `--red`…) — see Dark mode.
- **Show/hide with the `hidden` attribute**, not inline `style.display`. `style.css` has a global `[hidden] { display: none !important; }` so it beats any component `display` rule.
- **`style.css` order matters in two places.** The `[data-theme="dark"]` token block sits directly after `:root`. The single `@media (max-width: 699px)` mobile block is the **last thing in the file** on purpose: it overrides `.tabs`, `.toast`, `.app-version` and `.toast-update` at equal specificity, so it only wins by source order. Add mobile overrides there, never in a second media block.
- No external fonts or network assets. Fonts come from the system stacks defined in `:root` (`--font-hanzi`, `--font-mono`, `--font-serif`, `--font-sans`). Don't add `<link>` to Google Fonts etc. Usage is deliberate: `--font-sans` is the body default (UI, meanings, labels); `--font-hanzi` for hanzi, section/subsection titles and the toast; `--font-mono` only for pinyin (and the tiny version label); `--font-serif` italic only for the header subtitle and the about (i) glyph. Don't reintroduce serif or mono for body copy.
- If you add a new static asset (e.g. an image, another JSON file), add its path to `ASSETS` in `sw.js` and bump `CACHE` so existing installs refetch.
- **When shipping any user-visible change**, bump `CACHE` in `sw.js` (e.g. `handy-v0.15.0` → `handy-v0.16.0`). That string is the **single version source**: `index.html` and `js/` have no version literal, it reads the `handy-`-prefixed name back out of Cache Storage in `showAppVersion()` and renders the suffix as `.app-version` in the bottom-right corner. The literal has to live in `sw.js` because the browser only reinstalls a worker when `sw.js`'s own bytes change. Use semver loosely: patch for fixes/content, minor for new features.

## Future improvements

Open review items (UI polish, code structure, content ideas) live in `REVIEW.md`.

Rough priority order — high impact items first.

### Features
- **Emergency numbers** — 110 (police) / 120 (ambulance) / 119 (fire) as content entries
- **Show mode** — fullscreen hanzi to hold up to someone
- **Slow TTS** — speak at 0.7× rate; critical for learning unfamiliar tones. Long-press already copies, so it needs another gesture (e.g. tap the speaker icon)
- **Quiz shuffle** — randomize card order in quiz mode
- **Search result highlight** — visually distinguish the clicked card after tab navigation in global search

