# Security policy

Please report vulnerabilities privately with GitHub's "Report a vulnerability" button (Security tab, private vulnerability reporting). Do not open a public issue.

Supported: the latest release only.

Scope notes: the app is static and runs in the browser. Optional add-on tokens (Home Assistant) are stored in local storage on the user's device; any XSS would be serious, so the app ships a strict Content Security Policy with no inline scripts except a hashed import map.
