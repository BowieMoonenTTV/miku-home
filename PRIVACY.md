# Privacy

*Draft, written in plain language. This is not legal advice.*

**Short version: no data leaves your device or your own server.** We (BowieMoonen and contributors) never receive anything from the app.

## What the app does with your data

- **Speech:** when you press Speak, audio is processed on your device by Vosk (WebAssembly). It is not recorded to disk or sent anywhere.
- **Spoken replies:** only voices that your system marks as on-device are used. If none exist, replies are captions only.
- **Captions:** kept in the page while it is open. Clearing them or closing the page removes them.
- **Settings:** stored in your browser's local storage on this device.
- **Error log:** stored in local storage, at most 50 entries, with obvious secrets removed. You can view, copy, export or clear it. It is never sent anywhere.
- **Home Assistant token (optional):** stored only in this browser's local storage, and only sent to the Home Assistant address you configure.
- **Ollama (optional):** your typed or spoken text is sent only to the Ollama address you configure.

## What the app never does

No accounts. No analytics. No ads. No crash reporting service. No CDNs, web fonts or third-party scripts. The Content Security Policy only allows the app's own origin plus addresses you add. An automated test fails if the app requests anything from another origin.

## Hosting

If you open Miku from a hosted copy (GitHub Pages or a preview host), that host serves the files and may keep standard server logs (such as IP address and time), under its own privacy policy. After the first load the app works offline. To avoid any host, run it yourself.

## Children

The app collects nothing, so there is nothing to collect from children.

## Contact

Open an issue at https://github.com/BowieMoonenTTV/miku-home/issues. For security problems see [SECURITY.md](SECURITY.md).

Last updated: 2026-10-25.
