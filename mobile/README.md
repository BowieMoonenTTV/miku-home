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

## Version numbers

`patch-android.mjs` sets `versionName` to the `version` in `mobile/package.json` and works out
`versionCode` from it with `version-code.mjs`. The same version always gives the same code, and
a later version always gives a higher code, so Android accepts it as an update.

```text
versionCode = major * 1000000 + minor * 10000 + patch * 100 + stage
stage: alpha.N = 10 + N, beta.N = 30 + N, rc.N = 50 + N, final release = 99
```

| Version | versionCode |
| --- | --- |
| 0.1.0-beta (first public APK, old formula) | 100 |
| 0.1.0-beta (this formula) | 10030 |
| 0.1.0-beta.1 | 10031 |
| 0.1.0-rc | 10050 |
| 0.1.0 | 10099 |
| 0.2.0-beta | 20030 |
| 1.0.0 | 1000099 |

Every code is above 100, the code of the first public APK. To ship a new APK, raise the version
in `mobile/package.json`; never set `versionCode` by hand. Minor and patch go up to 99 and the
pre-release number up to 19; other version formats stop the build with an error.

## Permissions

- `RECORD_AUDIO`: only when you press Speak. Audio is processed on the phone and never sent anywhere.
- `MODIFY_AUDIO_SETTINGS`: needed by Android WebView for microphone capture.
- No `INTERNET` permission.

## Known limits

- Android WebView has no `speechSynthesis`. Builds from `main` speak replies with Android's own
  on-device text-to-speech instead; the v0.1.0-beta APK predates this and has no spoken replies.
  Replies are always captioned in an `aria-live` region, so TalkBack reads them aloud.
