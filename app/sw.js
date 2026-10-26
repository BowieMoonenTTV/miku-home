// Offline-first service worker. Same-origin only; never caches or proxies third-party requests.
const VERSION = "miku-v0.1.0-3";
const CORE = ["./", "index.html", "privacy.html", "status.html", "styles.css", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png",
  "js/app.js", "js/config.js", "js/replies.js", "js/tts.js", "js/stt.js", "js/crash.js", "vendor/vosk-browser/vosk.js"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match("index.html"))));
});
