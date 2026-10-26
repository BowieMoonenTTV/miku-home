# Roadmap

Every phase has exit criteria and an **accessibility gate**. A phase is not done until its gate passes. Self-hosting and headless operation are planned in [docs/HEADLESS.md](docs/HEADLESS.md).

## v0.1 Standalone PWA

- Exit: installable PWA works offline; typed and on-device speech input; captions; staging over HTTPS; CI green with zero external requests.
- A11y gate: axe and pa11y 0 errors; keyboard-only run; VoiceOver (iPhone) and TalkBack (Android) walkthrough by Bowie: say hi, read caption, repeat.

## v0.2 Home Assistant and Piper

- Exit: app talks to the user's Home Assistant Assist pipeline; Piper voice through HA; "say hi" plays on a Google Home / Cast speaker with a caption.
- A11y gate: every HA action is confirmed in captions; errors are spoken and captioned; token entry usable with a screen reader.

## v0.3 Whisper and Ollama on the CyberPower PC

- Exit: faster-whisper and Ollama run as services on the C machine; wake-on-LAN from the app or HA; local fallback when it sleeps.
- A11y gate: wake and wait states announced; speech recognition accuracy tested with Bowie's own speech; typed fallback always works.

## v0.4 Raspberry Pi and Cast

- Exit: a Pi voice satellite or kiosk survives reboot and power loss; Cast output works.
- A11y gate: audible start-up and error cues; no screen required.

## v0.5 Avatar

- Exit: VRM avatar with lip-sync, user-supplied model, opt-in.
- A11y gate: off by default; reduced motion respected; no information only shown visually.

## v0.6 Native wrappers

- Exit: Android APK (CI, sideload), Flatpak on Flathub, Tauri desktop builds, iOS when the Apple fee is approved.
- A11y gate: TalkBack, VoiceOver, Orca labels verified on each build; mic permission prompts explained.

## v1.0

- Exit: all above stable for 30 days; docs complete; signed Windows and macOS builds if funded.
- A11y gate: an external accessibility review or community testing round with blind users.
