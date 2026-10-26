---
title: Ollama and llama.cpp add-on
last_reviewed: 2026-10-25
owner: Miku (weekly review)
---

# Ollama or llama.cpp

1. Run Ollama on your own machine and pull a small model (default `llama3.2:3b`).
2. Allow the app's origin: set `OLLAMA_ORIGINS` to the app's URL.
3. Set `ollamaUrl` in `app/js/config.js`, add it to `MIKU_CONNECT`, rebuild the CSP.
4. When Home Assistant is not set, open questions go to Ollama's `/api/generate`; simple commands still answer locally.

llama.cpp's server can be used through an Ollama-compatible proxy; native support is on the roadmap.
