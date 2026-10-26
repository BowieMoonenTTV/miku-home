# Changelog

## [Unreleased]

### Fixed

- No double speech with a screen reader: the caption log is no longer a live region; replies are announced through a separate polite live region only when Miku's own voice is not speaking them.
- Speak button keeps the accessible name "Speak" and uses `aria-pressed` only; the visible "listening" hint is hidden from screen readers.
- Inconsistent speaking speed: the voice is now chosen deterministically after voices finish loading and saved, so replies no longer switch between voices with different natural speeds; the saved speed is validated and applied to every utterance; the utterance language is set to match the voice; long replies are split into short chunks with the same voice and speed; speech after cancel waits a moment (Chrome bug).
- Android app had no app voice at all (the Android WebView has no Web Speech API), so replies were read by the screen reader at its own speed. It now speaks through Android's on-device text-to-speech with the same speed setting.
- Avatar was present but inert: it only moved its mouth on word-boundary events, which many engines (including Android) never send, did nothing while listening or thinking, and with reduced motion drew one frame and was switched off on every reload. It now reacts to listening, thinking and speaking.
- Service worker cache bumped to `miku-v0.1.0-4` so installed copies pick up the fix.
- Flatpak: the window showed "This call is not available inside the sandbox" instead of the app. The sandbox has no network, so the proxy lookup was refused; the launcher now tells WebKit not to use a proxy for its own local server.

### Added

- Setting "Let my screen reader read replies": turns off Miku's voice and lets the screen reader read each reply. Captions stay visible.
- README warning that the Windows and macOS builds are unsigned.
- Avatar gestures: blink, wave hello, head tilt while listening, glance while thinking, nod when done, gentle breathing; still poses under reduced motion. Avatar state shown as plain text.
- Android: `@capacitor-community/text-to-speech` (MIT) for on-device speech.

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
- Web: <https://bowiemoonenttv.github.io/miku-home/> (GitHub Pages); mirror <https://miku-home.vercel.app/>.
