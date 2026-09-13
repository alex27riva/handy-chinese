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

Reviewed 2026-09-13. App is healthy and well documented; the script has been split into ES modules under `js/` (v0.16.1); clicks are delegated and search state is class-driven (v0.16.2), storage goes through `store` (v0.16.3), sections render through one `CARD_KIND`-driven path (v0.16.4), `scripts/check-content.py` validates content, tabs declare `type` instead of a CSS class (v0.16.5); the remaining items are within those modules. Ranked, highest impact first.

### Minor

- The install hint uses inline `style=` and `onclick=` in the HTML. Move that to JS.
- `[data-theme="dark"]` sits at line 850 of `style.css`. Move it next to `:root`.
- Two `@media (max-width: 699px)` blocks (lines 398 and 1106). Merge them.

### Suggested order

Only the minor list remains.

---

## 3. Content ideas

- Emergency numbers (110 / 120 / 119)
- Show mode (fullscreen hanzi to hold up to someone)
- Slow TTS on long-press (0.7× rate)
- Quiz shuffle
- Search-result highlight after navigating to a tab
