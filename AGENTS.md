# AGENTS.md

Quick facts for agents working in this repo.

## Run the app

```bash
python3 -m http.server
```
Browse to `http://localhost:8000/`. Must serve over HTTP — `file://` breaks fetch and service worker.

## Key quirks agents would miss

- **content.json changes require sw.js CACHE bump** — Without bumping `CACHE` constant, installed users won't get updates (cache-first strategy).
- **Translations required in both en and it** — Every `meaning`, `title`, `label` field must have both languages.
- **No build step** — Edit directly in source files. No npm/webpack/etc.
- **TTS needs real iOS testing** — Desktop browsers have different voice availability than mobile Safari.

## App name

- "Hàndy" = pun on "hàn" (汉/Chinese) + "handy" (useful)

## Adding new content

1. Edit `content.json` — add entries with both `en` and `it` translations
2. Bump `CACHE` in `sw.js` (e.g., `v1` → `v2`)
3. Serve and test locally before deploying