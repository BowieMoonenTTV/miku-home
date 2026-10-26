# Miku Home for Android (Capacitor)

Wraps `../app` in a native Android shell. Everything is bundled in the APK, including the
on-device speech model, so the app works with no internet connection.

## Build

Needs Node 22, JDK 21 and the Android SDK (platform 36, build-tools 36).

```sh
cd mobile
npm ci
npm run android:init   # first time: generates android/ and adds mic permissions
cd android && ./gradlew assembleRelease
```

The generated `android/` folder is not committed. CI (`.github/workflows/android.yml`)
regenerates it, builds, and signs only when the signing secrets exist. See `docs/signing.md`.

## Permissions

- `RECORD_AUDIO`: only when you press Speak. Audio is processed on the phone and never sent anywhere.
- `MODIFY_AUDIO_SETTINGS`: needed by Android WebView for microphone capture.
- No `INTERNET` permission.

## Known limits

- Android WebView has no `speechSynthesis`, so spoken replies are off in the APK.
  Replies are still captioned in an `aria-live` region, so TalkBack reads them aloud.
