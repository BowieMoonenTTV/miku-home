---
title: Phones, Pi and the C machine
last_reviewed: 2026-10-25
owner: Miku (weekly review)
---

# Phones, Raspberry Pi and the C machine

**Recommended lowest-friction free path:** install the PWA from the HTTPS staging site (or from your own server through `tailscale serve`) on each phone. No store, no fees. Native wrappers come later.

## Phones (PWA)

- **Android, Chrome:** open the site, menu, *Add to Home screen* / *Install app*. Mic needs HTTPS. TalkBack reads the labelled controls.
- **iPhone, Safari:** Share, *Add to Home Screen*. Web push needs iOS 16.4 or later and only works for installed web apps. Mic needs HTTPS. VoiceOver reads the labelled controls.
- **Away from home:** the Tailscale app on the phone gives HTTPS access to your own server (`https://<device>.<tailnet>.ts.net`). Each device sign-in needs your approval.

## Native wrappers (later)

- **Capacitor** (Android and iOS) wraps the same web app. Android APK can be built in CI and sideloaded for free. Google Play costs US$25 once. F-Droid is free but builds from source and reviews anti-features.
- **iOS** needs the Apple Developer Program, US$99 per year, for TestFlight or the App Store. A macOS CI runner builds it.
- **Tauri v2** covers desktop now and mobile too, but Capacitor is simpler for this web app.

## Raspberry Pi

- **Voice satellite:** Raspberry Pi OS Lite plus Home Assistant's `linux-voice-assistant` (successor of wyoming-satellite) with a USB mic and speaker. Headless, no screen.
- **Kiosk:** Raspberry Pi OS with desktop, Chromium in `--kiosk` mode pointing at the app. Needs a screen; less useful for a blind user except as a caption display for others.

## C machine (CyberPower PC)

- Ollama runs on Windows (installer, runs as a background app) or Linux (`systemd` service from the official script).
- Wake-on-LAN must be enabled in BIOS/UEFI and on the network adapter; Ethernet is reliable, Wi-Fi WoL often is not.
- Tailscale on the C machine gives the app an HTTPS name; set `OLLAMA_ORIGINS` so the browser may call it, and add its URL to the CSP with `MIKU_CONNECT`.

Nothing here has been installed or configured on any device.
