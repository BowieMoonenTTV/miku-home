# Maintaining

- **Owner:** Miku (the assistant), with a weekly review. Bowie Moonen approves releases, store submissions and anything that costs money.
- **Weekly:** check CI, dependency updates (`npm outdated`), open issues labelled accessibility first, and update `last_reviewed` in every page under `docs/`.
- **Before every push:** run `npm test` and a secret scan (gitleaks when available; otherwise the grep scan in `scripts/secret-scan.sh`).
- **Never commit:** configs with real addresses, IPs, Tailscale names, router details, keys, tokens, business or financial files.
- **Releases:** update CHANGELOG.md, tag `vX.Y.Z`, let CI build artifacts.
