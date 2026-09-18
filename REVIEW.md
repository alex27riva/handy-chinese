# Review

Open items only. Last updated 2026-09-18, against v0.24.1. Done items are recorded in git history and `CLAUDE.md`.

---

## 1. UI & visual

All items from the 2026-09-09 visual review shipped; the last four (dark card edges, desktop tab underline, missing-voice hint, maskable icon) in v0.17.0. Nothing open.

---

## 2. Code structure

Reviewed 2026-09-13; all items shipped in v0.16.1 – v0.16.6 (ES modules under `js/`, delegated events, class-driven search state, `store` wrapper, single `CARD_KIND` render path, `type` in content, `scripts/check-content.py`, no inline handlers, ordered `style.css`). Nothing open.

---

## 3. Product assessment (2026-09-18)

Two jobs, judged separately.

### Quick reference in China — useful today, roughly 7/10

Strengths:
- Offline, installable, fast, no login. That is the bar most travel apps fail.
- Content choice is right: app-UI vocabulary (确认 / 支付 / 验证码) is rare elsewhere and is exactly what Alipay / Didi / Meituan throw at a visitor. Signs, numbers, money and menu words cover most silent reading a tourist does.
- Copy plus the Pleco link (both one hold away, in show mode) is a real workflow (see word → copy → paste into a translator / Pleco), better than a paper phrasebook.
- Search folds tones, so half-remembered pinyin still finds the card.

Gaps that matter on the ground, in priority order:
1. ~~Show mode~~ — shipped in v0.24.0 (hold a card).
2. **TTS is effectively dead on current phones** (iOS 27 silent switch, Android 16 background-audio hardening; see `CLAUDE.md` › TTS). The speaker icon on every card promises something that mostly does not work, which erodes trust. Either ship pre-rendered clips played through `<audio>` (~330 entries × ~10 KB, precached) or hide the icon where it is known to be muted.
3. ~~Emergency numbers~~ — shipped in v0.24.1 (Emergencies & Help).
4. ~~Phrase gap audit~~ — 37 phrases added in v0.24.1 (听不懂 / 请写下来 / 请说慢一点, concrete allergies, WeChat / cash questions, taxi, sizes, room service, theft / lost phone). Re-audit after a real trip.
5. **Chinese finger counting (6–10)** — one image saves real confusion at markets.
6. Custom tab is the right place for the hotel address / host's phone; the empty state could suggest exactly that.

### Learning Chinese — weak, roughly 3/10, and not really this app's job

- Quiz is recognition only (hanzi → recall meaning): no reverse direction, no shuffle, no wrong-answer tracking, no spaced repetition. A learner opens Anki / Pleco / HelloChinese, not this.
- No working tone audio, no stroke order, no grammar. Fine to omit; competing there would bloat the app.

### Recommendation

Do not chase "learning". Own "the phrasebook that actually works offline in the taxi". Order: ~~show mode~~ (done) → ~~emergency numbers + phrase audit~~ (done) → fix or hide TTS → finger-counting image. Quiz shuffle and a reverse quiz are cheap extras afterwards, enough for "review on the plane".

---

## 4. Open items (short list)

- Phrase re-audit after a real trip
- Pre-rendered TTS clips, or hide the speaker icon where speech is muted
- Finger-counting image (6–10)
- Slow TTS (needs a gesture; the speaker icon is the obvious candidate once TTS is fixed)
- Quiz shuffle, reverse quiz (meaning → hanzi)
- Search-result highlight after navigating to a tab
