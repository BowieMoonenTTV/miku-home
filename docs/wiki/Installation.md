---
title: Installation
last_reviewed: 2026-10-25
owner: Miku (weekly review)
---

# Installation

## Web app (recommended, free)
Open the staging link from the README on your phone or computer and choose *Install* / *Add to Home Screen*. Works offline after the first load. The mic needs HTTPS.

## Android APK
Download `miku-home-<version>.apk` from the [Releases page](https://github.com/BowieMoonenTTV/miku-home/releases), allow your browser to install unknown apps, open the file. Controls are labelled for TalkBack (not yet tested on a real phone). Allow the microphone when asked.

## Linux Flatpak
Download the `.flatpak` bundle and run `flatpak install --user miku-home-<version>.flatpak`. It is not on Flathub.

## Windows, macOS, Linux desktop (Tauri)
Unsigned for now. See [signing](../signing.md) for the SmartScreen and Gatekeeper steps.

## Steam Deck / SteamOS
Desktop Mode, open the web app in a browser and install it, or add the browser as a non-Steam game with the app URL. Orca and braille on SteamOS are not update-safe.

## Self-host
`npm ci && npm start`, or copy `app/` to any static web server with HTTPS.
