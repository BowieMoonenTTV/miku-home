---
title: Avatar
last_reviewed: 2026-10-25
owner: Miku (weekly review)
---

# Avatar

The avatar is **off by default** and purely decorative; everything it shows is also in captions.

- Without a model, Miku shows a simple three.js face with teal twin tails.
- To use a VRM, place it at `app/avatars/miku.vrm`. Lip-sync uses TalkingHead's English viseme rules driven by speech word boundaries.
- **No Hatsune Miku model is shipped.** Crypton Future Media owns the character; each 3D model has its own terms (many forbid redistribution). Download one whose licence allows your use, for example from VRoid Hub, and keep it out of git.
- With `prefers-reduced-motion`, the avatar does not animate.
