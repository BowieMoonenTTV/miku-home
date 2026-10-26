# Contributing

Thanks for helping. Miku Home is built for blind and low-vision users and people with speech differences first.

1. Open an issue before large changes.
2. `npm ci && npm test` must pass. It runs html-validate, unit tests, the end-to-end test (which fails on any external request) and pa11y.
3. Rules that every change keeps:
   - No request to any other origin from the app. No CDN, analytics, fonts or remote error reporting.
   - Every voice feature has a typed equivalent and a caption.
   - Every control has a visible label, a 48px target and a visible focus outline.
   - Respect `prefers-reduced-motion`.
   - Vendored code keeps its licence file and is listed in THIRD_PARTY_NOTICES.md.
4. Never commit secrets, IP addresses, Tailscale names, tokens or personal info.
5. By contributing you agree your work is MIT licensed.

Please describe how you tested with a screen reader if you can (VoiceOver, TalkBack, NVDA or Orca).
