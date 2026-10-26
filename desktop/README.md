# Miku Home desktop (Tauri v2)

Wraps `../app` in a native window for Windows, macOS and Linux. All files are bundled,
so it runs with no internet connection. The same strict Content Security Policy as the
web app is applied.

```sh
cd desktop
npm ci
npx tauri icon ../app/icons/icon-512.png   # first time only, writes src-tauri/icons
npx tauri build
```

Linux needs `libwebkit2gtk-4.1-dev`, `librsvg2-dev` and `patchelf`.
Builds are unsigned unless the signing secrets in `docs/signing.md` are set in CI.
Unsigned Windows builds show a SmartScreen warning; unsigned macOS builds need
right-click, Open.
