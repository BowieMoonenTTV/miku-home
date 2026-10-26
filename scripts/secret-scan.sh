#!/usr/bin/env bash
# Fallback secret scan when gitleaks is not installed. Fails on likely secrets in tracked files.
set -euo pipefail
if command -v gitleaks >/dev/null; then exec gitleaks detect --no-banner --redact; fi
files=$(git ls-files | grep -vE '^(app/vendor|app/models|package-lock.json)' || true)
pat='(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[A-Za-z0-9-]{10,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|tskey-[A-Za-z0-9-]+|sk-[A-Za-z0-9]{20,}|\b(10\.[0-9]{1,3}|192\.168|172\.(1[6-9]|2[0-9]|3[01]))(\.[0-9]{1,3}){2,3}\b|[a-z0-9-]+\.[a-z0-9-]+\.ts\.net)'
hits=$(echo "$files" | xargs -r grep -nEI "$pat" | grep -vE "your-tailnet|example\.ts\.net|<[a-z-]+>" || true)
if [ -n "$hits" ]; then echo "$hits"; echo "Possible secret found"; exit 1; fi
echo "secret scan: clean ($(echo "$files" | wc -l) files)"
