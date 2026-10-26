# App stores: status and blockers

Checked Oct 25, 2026. Nothing has been submitted to any store.

| Store | Built locally | Store lint | Submitted | Blocker |
|---|---|---|---|---|
| GitHub Releases | APK, Flatpak bundle, .deb | n/a | No | Repo does not exist yet |
| Flathub | Yes (GNOME 51 runtime) | Fails only on repo URL and screenshot (repo missing) | No | See below |
| winget | No (needs Windows CI build) | Not run | No | Needs a release URL |
| Homebrew | No (needs macOS CI build) | Not run | No | Needs a release URL; homebrew/cask notability |
| Decky | n/a | Not run | No | Not started |
| Google Play | APK only | n/a | No | US$25 one-time fee, needs approval |

## Flathub: read before submitting

From docs.flathub.org/docs/for-app-authors/requirements (fetched Oct 25, 2026):

1. **AI policy.** "AI tools or agents must not open or automate Flathub submission pull
   requests, or generate their commit messages, descriptions, review comments, or replies."
   "Flathub manifests must not contain AI-generated or AI-assisted content." AI-generated
   code in the app must be disclosed. So the Flathub manifest in this repo is a local build
   recipe only. The submission manifest and PR must be written by a person.
2. **App ID must match the repo.** `io.github.BowieMoonenTTV.MikuHome` maps to
   `github.com/BowieMoonenTTV/MikuHome`. Either name the repo `MikuHome`, or use
   `io.github.BowieMoonenTTV.miku-home` (a dash is allowed in the last part).
3. **Trademark.** Names and icons must not violate trademarks. "Miku" is associated with
   Crypton Future Media's Hatsune Miku. Consider a distinct store name.
4. **History and stability.** New apps need meaningful development history and a stable
   release. Betas go to the beta repo only after acceptance.
5. **Web wrappers.** Simple web wrappers without real desktop integration are rejected.
6. Runtime must be the latest at submission time (GNOME 51 on Oct 25, 2026).
