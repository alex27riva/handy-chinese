<div align="center">
  <img src="icon.svg" width="90" alt="Hàndy icon"/>
  <h1>Hàndy</h1>
  <p><strong>hàn</strong> (汉) + <strong>handy</strong> — useful app for Chinese travel</p>
  <p><a href="https://handyhanzi.app">handyhanzi.app</a></p>
</div>

Offline-ready PWA for Chinese travel vocabulary and phrases. No login, no account, no internet required after first load. Installable on iOS and Android. No build step, no dependencies — plain HTML, CSS and ES modules.

## Features

**Content** — 340 entries and 16 travel tips, all in `content.json`, every label in English and Italian

- **Vocabulary** (词汇) — food, signs, numbers, countries, and app-UI terms (确认 / 支付 / 验证码) for Alipay, WeChat, Didi, Meituan
- **Phrases** (短语) — essentials, directions and transport, restaurants, shopping and money, hotel check-in, emergencies (110 police / 120 ambulance / 119 fire)
- **Medical** (医疗) — symptoms, pharmacy, hospital
- **Apps** (推荐) — the Chinese apps worth installing before you land
- **My** (我的) — add your own phrases with hanzi, pinyin, meaning and a note; export / import them as JSON
- **Favorites** (收藏) — star any card, review the lot from the ☆ in the toolbar

**Using it**

- **Tap** a card to hear it spoken (see the note on TTS below)
- **Hold** a card for **show mode** — the hanzi as large as the screen allows, with Speak, Copy, Save and Pleco. Made for holding the phone up to a taxi driver or a waiter; it keeps the screen awake while it is open
- **Swipe** left / right to change tab
- **Word of the day** and **帮手's travel tips** share one carousel above the tabs — swipe it sideways or tap the chevron; tap the mascot for the next tip
- **Search** across every tab at once, insensitive to tone marks and spaces (`nihao`, `ni hao` and `nǐ hǎo` all find `你好`)
- **Jump bar** — sticky chips on the long tabs, one per section
- **Pleco** — 📖 on each card opens the entry in Pleco (iOS / Android)
- **Quiz mode** (？) hides pinyin and meaning, tap to reveal · **Hide pinyin** (拼) for hanzi only
- **Dark mode**, collapsible sections, EN / IT toggle — all remembered between visits

**PWA**

- Fully offline once installed (service worker, cache-first)
- iOS: Safari → Share → **Add to Home Screen**
- Android: Chrome → menu → **Install app** (or the Install button in the banner)

### A note on speech

Tap-to-speak uses the browser's own `speechSynthesis` with a `zh-CN` voice, and current phones mute it: iOS 27 routes it as system speech, which the ring/silent switch silences on its own, and Android 16's background-audio hardening mutes the TTS service. The app says so once, the first time you tap. Nothing on the page can lift either mute — pre-rendered audio clips are the open fix. Everything else works offline regardless.

## Run locally

No build step, but it **must be served over HTTP** — `file://` breaks both the `content.json` fetch and the service worker.

```
python3 -m http.server
```

Then open `http://localhost:8000/`.

Validate content after editing `content.json`:

```
python3 scripts/check-content.py
```

The same check runs as a pre-commit hook — enable it once per clone with `git config core.hooksPath .githooks`.
