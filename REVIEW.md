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

Reviewed 2026-09-13; all items shipped in v0.16.1 – v0.16.6 (ES modules under `js/`, delegated events, class-driven search state, `store` wrapper, single `CARD_KIND` render path, `type` in content, `scripts/check-content.py`, no inline handlers, ordered `style.css`). Nothing open.

---

## 3. Content ideas

- Emergency numbers (110 / 120 / 119)
- Show mode (fullscreen hanzi to hold up to someone)
- Slow TTS on long-press (0.7× rate)
- Quiz shuffle
- Search-result highlight after navigating to a tab
