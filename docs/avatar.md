---
title: Avatar
last_reviewed: 2026-10-26
owner: Miku (weekly review)
---

# Avatar

The avatar is **off by default** and purely decorative; everything it shows is also in captions.

- Without a model, Miku shows a simple three.js face with teal twin tails.
- To use a VRM, place it at `app/avatars/miku.vrm`. Lip-sync uses TalkingHead's English viseme rules driven by speech word boundaries. Where the voice engine sends no word boundaries (common on Android), the mouth moves with a simple rhythm while Miku talks. The VRM gesture path has not been tested with a real model yet.
- **No Hatsune Miku model is shipped.** Crypton Future Media owns the character; each 3D model has its own terms (many forbid redistribution). Download one whose licence allows your use, for example from VRoid Hub, and keep it out of git.
- The avatar reacts to what Miku is doing: **listening** (small head tilt), **thinking** (glances aside), **speaking** (mouth moves), and **done speaking** (a nod). It waves when it is turned on and when you greet Miku, blinks every few seconds, and breathes and sways gently while resting. Each gesture is a few small transforms at about 30 frames a second, and nothing draws while the page is hidden.
- Its state is also written as plain text under it ("Avatar: listening."). That text is not a live region, so it never interrupts a screen reader; the avatar itself stays `aria-hidden`.
- With `prefers-reduced-motion` (on Android: Settings, Accessibility, Remove animations), the avatar can still be turned on, but there is no animation loop: it holds calm, still poses for each state (head tilted, eyes aside, mouth half open, hand raised) and redraws only when the state changes. No blinking, waving or swaying, and nothing flashes.
