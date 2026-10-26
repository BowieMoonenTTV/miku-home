// Minimal, dependency-free static server for the NAS (or any machine). Node 18+.
// Serves ../app with security headers. It holds no secrets and proxies nothing.
// Usage: PORT=8080 node server/server.js   (put Tailscale Serve or Caddy in front for HTTPS)
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../app/", import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "127.0.0.1";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".gz": "application/gzip", ".vrm": "model/gltf-binary", ".glb": "model/gltf-binary", ".txt": "text/plain; charset=utf-8" };

export function createMikuServer() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      if (url.pathname === "/healthz") { res.writeHead(200, { "Content-Type": "application/json" }); return res.end('{"ok":true}'); }
      let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
      let file = join(ROOT, path);
      if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, "index.html");
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
        "Permissions-Policy": "microphone=(self), camera=(), geolocation=()", "Cross-Origin-Opener-Policy": "same-origin", "Cache-Control": file.endsWith("sw.js") ? "no-cache" : "public, max-age=300" });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); }
  });
}
if (import.meta.url === `file://${process.argv[1]}`) createMikuServer().listen(PORT, HOST, () => console.log(`Miku Home on http://${HOST}:${PORT}`));
