# Third-party notices

Miku Home is MIT licensed. It vendors these components unchanged in `app/vendor/` and `app/models/`. Each folder keeps the original licence file. Licences were checked against each project's LICENSE file (or package metadata where noted) on 2026-10-25.

| Component | Version | Author | Licence | Source | Files |
| --- | --- | --- | --- | --- | --- |
| three.js | 0.186.1 | three.js authors | MIT | <https://github.com/mrdoob/three.js> | `vendor/three/` |
| @pixiv/three-vrm | 3.5.5 | pixiv Inc. | MIT | <https://github.com/pixiv/three-vrm> | `vendor/three-vrm/` |
| TalkingHead (lipsync-en.mjs only) | commit 46b32ee | Mika Suominen | MIT | <https://github.com/met4citizen/TalkingHead> | `vendor/talkinghead/` |
| home-assistant-js-websocket | 9.7.1 | Home Assistant / Open Home Foundation | Apache-2.0 | <https://github.com/home-assistant/home-assistant-js-websocket> | `vendor/haws/` |
| axe-core | 4.14.0 | Deque Systems | MPL-2.0 | <https://github.com/dequelabs/axe-core> | `vendor/axe-core/` |
| vosk-browser | 0.0.8 | Ciaran O'Reilly | Apache-2.0 (from package.json; the repo LICENSE link returned 404, the full Apache-2.0 text is included) | <https://github.com/ccoreilly/vosk-browser> | `vendor/vosk-browser/` |
| vosk-model-small-en-us-0.15 | 0.15 | Alpha Cephei | Apache-2.0 (per <https://alphacephei.com/vosk/models>) | <https://alphacephei.com/vosk/models> | `models/` |

axe-core is MPL-2.0: it is used unmodified, and its source is available at the link above. It only runs when you press "Check this page for accessibility issues" or in tests.

No Hatsune Miku 3D model is included. Character rights belong to Crypton Future Media, and model licences vary. Use your own VRM at `app/avatars/miku.vrm` only if its licence allows it.
