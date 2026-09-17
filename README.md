<div align="center">
  <img src="icon.svg" width="90" alt="Hàndy icon"/>
  <h1>Hàndy</h1>
  <p><strong>hàn</strong> (汉) + <strong>handy</strong> — useful app for Chinese travel</p>
</div>

Offline-ready PWA for Chinese vocabulary and phrases. No login, no account, no internet required after first load. Installable on iOS and Android.

## Features

**Content**
- Vocabulary — app UI terms (Alipay, WeChat, Maps, Didi, etc.)
- Travel Phrases — greetings, directions, food, shopping, hotel check-in
- Medical — symptoms, pharmacy, hospital and emergency phrases
- Apps — recommended Chinese apps with QR codes
- My (我的) — add your own phrases (hanzi, pinyin, meaning, note), export / import them as JSON
- Favorites — star any card, review them in the ☆ overlay from the toolbar

**UX**
- Tap any card to hear native zh-CN TTS pronunciation
- Quiz mode — hide pinyin and meaning, tap to reveal
- Hide pinyin — study hanzi only
- Dark mode
- Collapsible sections
- Global search across all tabs — tone-mark and space insensitive (`nihao` finds `nǐ hǎo`)
- Swipe left/right to switch tabs
- EN / IT language toggle

**PWA**
- Fully offline once installed (service worker, cache-first)
- iOS: Safari → Share → Add to Home Screen
- Android: Chrome → menu → Install app

## Run locally

No build step. Serve over HTTP (required for service worker and `content.json` fetch):

```
python3 -m http.server
```

Validate content after editing `content.json`:

```
python3 scripts/check-content.py
```

Then open `http://localhost:8000/`.
