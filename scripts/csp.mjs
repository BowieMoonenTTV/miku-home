// Computes the hash of the inline import map and writes a strict CSP into app/index.html.
// Optional add-on origins (your own Home Assistant / Ollama) are appended from env at build time:
//   MIKU_CONNECT="https://ha.example.ts.net https://ollama.example.ts.net" node scripts/csp.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const p = new URL("../app/index.html", import.meta.url);
let html = readFileSync(p, "utf8");
const m = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
const hash = createHash("sha256").update(m[1]).digest("base64");
const extra = (process.env.MIKU_CONNECT || "").trim();
const extraWs = extra.split(/\s+/).filter(Boolean).map((u) => u.replace(/^http/, "ws")).join(" ");
const csp = [
  "default-src 'self'",
  `script-src 'self' 'sha256-${hash}' 'wasm-unsafe-eval' 'unsafe-eval'`,
  "worker-src 'self' blob:",
  `connect-src 'self' blob: ${extra} ${extraWs}`.replace(/\s+/g, " ").trim(),
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "style-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "manifest-src 'self'",
].join("; ");
html = html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]*(")/, `$1${csp}$2`);
writeFileSync(p, html);
console.log("CSP written:", csp);
