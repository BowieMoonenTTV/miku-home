---
title: Home Assistant add-on
last_reviewed: 2026-10-25
owner: Miku (weekly review)
---

# Home Assistant

1. In Home Assistant, open your profile, *Security*, and create a long-lived access token.
2. Set `haUrl` in `app/js/config.js` to your HTTPS Home Assistant address, add it to `MIKU_CONNECT`, rebuild the CSP.
3. In the app, open *Home Assistant connection*, paste the token, press *Save on this device*. The token stays in this browser only.
4. Miku sends your text to `conversation/process`, so Assist intents (lights, media, Cast) work.
