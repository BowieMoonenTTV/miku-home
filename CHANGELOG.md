# Changelog

## [Unreleased]

## [0.1.0-beta] - 2026-10-25 (draft)

- Android wrapper (Capacitor 8, `mobile/`): mic permission only, no INTERNET permission.
- Desktop wrapper (Tauri 2, `desktop/`) and an offline Flatpak (`packaging/flatpak/`, GNOME 51 runtime, no network permission).
- Store status and Flathub policy notes in `docs/stores.md`.

### Added
- Standalone PWA: typed and on-device spoken input (Vosk), on-device voices, captions log, keyboard shortcuts.
- Optional avatar (three.js placeholder, VRM support, TalkingHead lip-sync).
- Optional Home Assistant and Ollama add-ons, configured on the device.
- Local error log with view, copy and export.
- Strict CSP, offline service worker, privacy page.
- Tests: html-validate, unit, Playwright end-to-end with a zero-external-request check, axe-core, pa11y.
- Web: https://bowiemoonenttv.github.io/miku-home/ (GitHub Pages); mirror https://miku-home.vercel.app/.
