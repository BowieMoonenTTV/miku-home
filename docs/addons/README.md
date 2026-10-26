---
title: Add-ons
last_reviewed: 2026-10-25
owner: Miku (weekly review)
---

# Optional add-ons

The baseline (typed and on-device speech, local voices, captions) works with nothing else installed. Add-ons are **auto-detected** when you configure them in `app/js/config.js` (or later in settings) and rebuild the CSP:

```bash
MIKU_CONNECT="https://ha.<your-tailnet>.ts.net https://ollama.<your-tailnet>.ts.net" node scripts/csp.mjs
```

This also writes the origins into `app/vercel.json`, so keep that build on your own tailnet and do not deploy it to the public mirror (see [../vercel.md](../vercel.md)).

| Add-on | Doc | What it adds |
| --- | --- | --- |
| Home Assistant | [home-assistant.md](home-assistant.md) | Smart home control, Assist pipeline, Cast speakers |
| Ollama or llama.cpp | [llm.md](llm.md) | A smarter "brain" for open questions |
| Piper or Whisper server | [speech-servers.md](speech-servers.md) | Better voices and recognition through Home Assistant |
| Avatar packs | [../avatar.md](../avatar.md) | A VRM model you are allowed to use |

The app only contacts the addresses you add. Nothing else.
