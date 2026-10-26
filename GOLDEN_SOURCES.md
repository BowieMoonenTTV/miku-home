# Golden sources

External sources used for Miku Home work on October 26, 2026. Each entry says what it was used for and where it lives. Every link was checked on October 26, 2026. Times are Eastern Time (Toronto).

## Test sites

| Used for | Source | Where |
| --- | --- | --- |
| Web test site (staging) | GitHub Pages | <https://bowiemoonenttv.github.io/miku-home/> |
| Web test site (staging) | Vercel | <https://miku-home.vercel.app> |

## Changes and builds

| Used for | Source | Where |
| --- | --- | --- |
| Voice speed and avatar fixes, Flatpak sandbox fix (merged 2:39 PM) | PR #5 | <https://github.com/BowieMoonenTTV/miku-home/pull/5> |
| Merge of PR #5 into `main` | Commit `2c91a9e` | <https://github.com/BowieMoonenTTV/miku-home/commit/2c91a9eaf22750c115d1818e858f734ffdb4357f> |
| Voice speed and avatar change | Commit `5051533` | <https://github.com/BowieMoonenTTV/miku-home/commit/5051533> |
| Flatpak: no proxy lookup for the local app | Commit `19f81f5` | <https://github.com/BowieMoonenTTV/miku-home/commit/19f81f5> |
| Screen reader fixes: no double speech, Speak button name (merged 2:39 PM) | PR #1 | <https://github.com/BowieMoonenTTV/miku-home/pull/1> |
| Android: no backup or device transfer of app data (open) | PR #2 | <https://github.com/BowieMoonenTTV/miku-home/pull/2> |
| README build and testing status (open) | PR #3 | <https://github.com/BowieMoonenTTV/miku-home/pull/3> |
| Build-only option for desktop builds (open) | PR #4 | <https://github.com/BowieMoonenTTV/miku-home/pull/4> |
| macOS desktop build check, build only, no upload (passed) | GitHub Actions run 40364053283 | <https://github.com/BowieMoonenTTV/miku-home/actions/runs/40364053283> |

## Releases

| Used for | Source | Where |
| --- | --- | --- |
| Current beta release | v0.1.0-beta (pre-release) | <https://github.com/BowieMoonenTTV/miku-home/releases/tag/v0.1.0-beta> |
| PR #5 test APK and its SHA256SUMS, not yet tested on a real device | v0.1.0-beta-pr5 (pre-release) | <https://github.com/BowieMoonenTTV/miku-home/releases/tag/v0.1.0-beta-pr5> |

## Libraries and references

| Used for | Source | Where |
| --- | --- | --- |
| Android app speaks with the phone's own voice, at the same speed setting as the browser | `@capacitor-community/text-to-speech` 8.0.2 | <https://registry.npmjs.org/@capacitor-community/text-to-speech/8.0.2>, <https://github.com/capacitor-community/text-to-speech> |
| Browser voice and its speed setting | MDN: Web Speech API, `SpeechSynthesisUtterance.rate` | <https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API>, <https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/rate> |
| Calm avatar poses when reduced motion is on | MDN: `prefers-reduced-motion` | <https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion> |
| Avatar mouth movement (viseme rules) | TalkingHead | <https://github.com/met4citizen/TalkingHead> |
| Flatpak fix: tell WebKit not to use a proxy | WebKitGTK `NetworkSession.set_proxy_settings` | <https://webkitgtk.org/reference/webkitgtk/stable/method.NetworkSession.set_proxy_settings.html> |
| Flatpak fix: the app has no network permission | Flatpak docs: sandbox permissions | <https://docs.flatpak.org/en/latest/sandbox-permissions.html> |

## Test tools

| Used for | Source | Where |
| --- | --- | --- |
| Accessibility checks | pa11y | <https://github.com/pa11y/pa11y> |
| Accessibility rules engine | axe-core | <https://github.com/dequelabs/axe-core> |
| HTML checks | html-validate | <https://html-validate.org/> |
| Browser tests | Playwright | <https://playwright.dev/> |

Not yet tested: the PR #5 APK on a real phone with TalkBack, and the Flatpak on a real Linux desktop with Orca.
