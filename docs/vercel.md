# Vercel mirror

The Vercel mirror at <https://miku-home.vercel.app/> serves the `app/` folder as static files.
`app/vercel.json` gives it the same security headers as `server/server.js`, plus a
Content-Security-Policy header:

- `Content-Security-Policy`: the same policy as each page's meta tag, plus `frame-ancestors 'none'`.
  Browsers ignore `frame-ancestors` in a meta tag, so only the header stops other sites framing Miku.
- `X-Frame-Options: DENY`, for older browsers that do not support `frame-ancestors`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: no-referrer`.
- `Permissions-Policy: microphone=(self), camera=(), geolocation=()`.
- `Cross-Origin-Opener-Policy: same-origin`.
- `Cache-Control: no-cache` on `sw.js`, so app updates arrive quickly.

## Keeping it in sync

Do not edit `app/vercel.json` by hand. `npm run csp` (`scripts/csp.mjs`) writes it together with
the CSP in `app/index.html`. A unit test fails if the header and the meta tag differ.

If you run `npm run csp` with `MIKU_CONNECT` set, your add-on origins go into both files.
Do not deploy that build to the public mirror; keep it on your own tailnet.

## Deploying

A deployment must upload the contents of `app/` as its root, including `app/vercel.json`.
A deployment made without that file has none of these headers. Check after each deploy:

```sh
curl -sI https://miku-home.vercel.app/ | grep -i -E "content-security|x-frame|nosniff|referrer|permissions"
```

GitHub Pages ignores `vercel.json`, so the Pages site still relies on the meta tag CSP only.
