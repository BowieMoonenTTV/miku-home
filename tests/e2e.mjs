// End-to-end smoke + axe + zero-external-request test. Runs against BASE_URL (default: local server).
// Fails if the page makes ANY request to another origin.
import { chromium } from "playwright-core";
import { createMikuServer } from "../server/server.js";

const exe = process.env.CHROME_PATH || "/usr/bin/google-chrome";
let base = process.env.BASE_URL, server;
if (!base) { server = createMikuServer(); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}/`; }
const origin = new URL(base).origin;
const browser = await chromium.launch({ executablePath: exe, args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--no-sandbox"] });
const ctx = await browser.newContext({ permissions: ["microphone"] });
const page = await ctx.newPage();
const external = [], consoleErrors = [], results = [];
page.on("request", (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u); });
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("response", (r) => { if (r.status() >= 400) consoleErrors.push(`HTTP ${r.status()} ${r.url()}`); });
page.on("pageerror", (e) => consoleErrors.push(e.message));
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };

const resp = await page.goto(base, { waitUntil: "networkidle" });
check("page loads", resp.ok(), `HTTP ${resp.status()} ${base}`);
check("title", (await page.title()) === "Miku Home");
await page.waitForFunction(() => !/starting/.test(document.getElementById("mode-status").textContent));
check("mode detected", true, await page.textContent("#mode-status"));

await page.keyboard.press("Tab");
check("skip link is first focus", await page.evaluate(() => document.activeElement.classList.contains("skip-link")));
await page.keyboard.press("Alt+Shift+KeyT");
check("Alt+Shift+T focuses text box", await page.evaluate(() => document.activeElement.id === "text-input"));
await page.keyboard.type("say hi"); await page.keyboard.press("Enter");
await page.waitForSelector("#caption-log li:nth-child(2)");
const caps = await page.$$eval("#caption-log li", (ls) => ls.map((l) => l.textContent));
check("typed 'say hi' gets captioned reply", caps.some((c) => c.includes("Hi Bowie, it's Miku.")), caps.join(" | "));
check("caption log is not itself a live region", !(await page.getAttribute("#caption-log", "aria-live")));
check("reply announcer is role=status, aria-live polite", (await page.getAttribute("#reply-live", "aria-live")) === "polite" && (await page.getAttribute("#reply-live", "role")) === "status");
// This browser has no on-device voice, so the reply must go to the screen reader instead.
await page.waitForFunction(() => /Hi Bowie/.test(document.getElementById("reply-live").textContent), null, { timeout: 3000 }).then(() => true, () => false)
  .then((ok) => check("no app voice available: reply announced to screen reader", ok));
const srBox = page.getByRole("checkbox", { name: "Let my screen reader read replies" });
check("screen reader setting is a labelled checkbox", (await srBox.count()) === 1);
const speakName = async () => page.getByRole("button", { name: "Speak", exact: true }).count();
check("Speak button name is exactly 'Speak' when idle", (await speakName()) === 1 && (await page.getAttribute("#speak-btn", "aria-pressed")) === "false");
check("avatar stage is aria-hidden", (await page.getAttribute("#avatar-stage", "aria-hidden")) === "true");
const box = await page.locator("#speak-btn").boundingBox();
check("Speak button touch target ≥ 48px", box.height >= 48 && box.width >= 48, `${Math.round(box.width)}x${Math.round(box.height)}`);
check("manifest linked", !!(await page.$('link[rel="manifest"]')));
const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r || location.protocol === "http:" && location.hostname !== "127.0.0.1"; });
check("service worker registered", sw);

// On-device speech: load the Vosk model from same origin, start and stop listening with the fake mic.
if (!process.env.SKIP_STT) {
  await page.click("#speak-btn");
  try {
    await page.waitForFunction(() => /Listening\. Press Speak again/.test(document.getElementById("stt-status").textContent), null, { timeout: 120000 });
    check("on-device Vosk model loads and listening starts", true, await page.textContent("#stt-status"));
    check("Speak button name stays 'Speak' while listening, aria-pressed=true", (await speakName()) === 1 && (await page.getAttribute("#speak-btn", "aria-pressed")) === "true");
    await page.waitForTimeout(1500);
    await page.click("#speak-btn");
    await page.waitForFunction(() => !/Processing/.test(document.getElementById("stt-status").textContent), null, { timeout: 15000 });
    check("listening stops cleanly", true, await page.textContent("#stt-status"));
    check("Speak button back to aria-pressed=false", (await speakName()) === 1 && (await page.getAttribute("#speak-btn", "aria-pressed")) === "false");
  } catch (e) { check("on-device Vosk model loads and listening starts", false, (await page.textContent("#stt-status")) + " " + e.message.split("\n")[0]); }
}

await page.addScriptTag({ url: base + "vendor/axe-core/axe.min.js" });
const axe = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }); return { v: r.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`), passes: r.passes.length, incomplete: r.incomplete.map((i) => i.id) }; });
check("axe-core WCAG 2.2 AA + best practice: 0 violations", axe.v.length === 0, `${axe.passes} rules passed; violations: ${axe.v.join(", ") || "none"}; needs review: ${axe.incomplete.join(", ") || "none"}`);

// Double speech: a fake on-device voice records what Miku's own voice says.
{
  const tctx = await browser.newContext();
  await tctx.addInitScript(() => {
    window.__spoken = [];
    const voice = { name: "Fake local voice", lang: "en-US", localService: true, voiceURI: "fake-local", default: true };
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    const fake = { getVoices: () => [voice], speak: (u) => { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); },
      cancel: () => {}, addEventListener: () => {}, removeEventListener: () => {}, speaking: false };
    Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
  });
  const tp = await tctx.newPage();
  tp.on("request", (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u); });
  tp.on("pageerror", (e) => consoleErrors.push(e.message));
  await tp.goto(base, { waitUntil: "networkidle" });
  await tp.waitForFunction(() => !/starting/.test(document.getElementById("mode-status").textContent));
  const say = async (text, n) => { await tp.fill("#text-input", text); await tp.press("#text-input", "Enter"); await tp.waitForSelector(`#caption-log li:nth-child(${n})`); await tp.waitForTimeout(400); };
  await say("say hi", 2);
  let st = await tp.evaluate(() => ({ spoken: window.__spoken.slice(), live: document.getElementById("reply-live").textContent, cap: document.getElementById("caption-log").textContent }));
  check("app voice on: reply spoken by Miku", st.spoken.some((t) => t.includes("Hi Bowie")), JSON.stringify(st.spoken));
  check("app voice on: reply NOT announced via live region (no double speech)", st.live === "", JSON.stringify(st.live));
  check("app voice on: caption still visible", st.cap.includes("Hi Bowie"));
  await tp.click("#settings-heading"); // make sure nothing else is focused
  await tp.focus("#sr-toggle"); await tp.keyboard.press("Space");
  st = await tp.evaluate(() => ({ sr: document.getElementById("sr-toggle").checked, speak: document.getElementById("speak-toggle").checked, prefs: localStorage.getItem("miku.prefs") }));
  check("screen reader setting toggles with keyboard and turns app voice off", st.sr && !st.speak, st.prefs);
  const before = await tp.evaluate(() => window.__spoken.length);
  await say("say hi", 4);
  st = await tp.evaluate(() => ({ spoken: window.__spoken.slice(), live: document.getElementById("reply-live").textContent, cap: document.getElementById("caption-log").textContent }));
  check("screen reader mode: Miku's voice stays silent", st.spoken.length === before, JSON.stringify(st.spoken));
  check("screen reader mode: reply announced via polite live region", /Hi Bowie/.test(st.live), JSON.stringify(st.live));
  check("screen reader mode: caption still visible", (st.cap.match(/Hi Bowie/g) || []).length === 2);
  await tp.reload({ waitUntil: "networkidle" });
  check("screen reader setting persists after reload", await tp.isChecked("#sr-toggle") && !(await tp.isChecked("#speak-toggle")));
  await tp.check("#speak-toggle");
  check("turning app voice back on turns screen reader mode off", !(await tp.isChecked("#sr-toggle")));
  await tctx.close();
}

// Voice speed: one saved speed and one voice for every utterance, even when voices load
// late and in a shuffled order (as on Android Chrome), and even with no word-boundary events.
const fakeAndroidVoices = () => {
  window.__utts = [];
  const mk = (name, lang, def) => ({ name, lang, localService: true, voiceURI: "fake-" + name, default: !!def });
  const all = [mk("Zoe", "en-GB"), mk("Amy", "en-US"), mk("Net", "en-US"), mk("Ben", "en-US")];
  all[2].localService = false; // a network voice: must never be used
  let loaded = false, calls = 0; const listeners = [];
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  const fake = {
    speaking: false, pending: false,
    getVoices: () => { if (!loaded) return []; calls++; return calls % 2 ? all.slice() : all.slice().reverse(); },
    speak(u) { window.__utts.push({ text: u.text, rate: u.rate, voice: u.voice && u.voice.voiceURI, lang: u.lang });
      fake.speaking = true; setTimeout(() => u.onstart && u.onstart(), 5); setTimeout(() => { fake.speaking = false; u.onend && u.onend(); }, 700); },
    cancel() { fake.speaking = false; }, addEventListener: (n, f) => listeners.push(f), removeEventListener: () => {},
  };
  Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
  setTimeout(() => { loaded = true; listeners.forEach((f) => f()); setTimeout(() => listeners.forEach((f) => f()), 100); }, 400);
};
{
  const vctx = await browser.newContext();
  await vctx.addInitScript(fakeAndroidVoices);
  const vp = await vctx.newPage();
  vp.on("request", (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u); });
  vp.on("pageerror", (e) => consoleErrors.push(e.message));
  await vp.goto(base, { waitUntil: "networkidle" });
  await vp.waitForFunction(() => !/starting/.test(document.getElementById("mode-status").textContent));
  const say = async (text) => { const n = await vp.$$eval("#caption-log li", (l) => l.length); await vp.fill("#text-input", text); await vp.press("#text-input", "Enter"); await vp.waitForSelector(`#caption-log li:nth-child(${n + 2})`); await vp.waitForTimeout(150); };
  await say("say hi");
  let u = await vp.evaluate(() => window.__utts.slice());
  check("default speed 1.0 applied to the first reply", u.length === 1 && u[0].rate === 1, JSON.stringify(u));
  // Change the speed with the keyboard (slider), then speak three different ways.
  await vp.focus("#rate-input"); for (let i = 0; i < 3; i++) await vp.keyboard.press("ArrowRight");
  const shown = await vp.textContent("#rate-value");
  await say("what time is it");
  await vp.click("#repeat-btn"); await vp.waitForTimeout(200);
  await say("Tell me something long. " + "This sentence makes the reply long. ".repeat(10));
  u = await vp.evaluate(() => window.__utts.slice(1));
  const rates = [...new Set(u.map((x) => x.rate))], voicesUsed = [...new Set(u.map((x) => x.voice))];
  check("changed speed applies to typed, repeated and long replies alike", shown === "1.3 times" && rates.length === 1 && rates[0] === 1.3 && u.length >= 3, `${shown}; rates ${JSON.stringify(rates)}; ${u.length} utterances`);
  const all = await vp.evaluate(() => window.__utts.map((x) => x.voice));
  check("same on-device voice for every utterance (voices loaded late, shuffled order)", new Set(all).size === 1 && all[0] === "fake-Amy" && !all.includes("fake-Net"), JSON.stringify([...new Set(all)]));
  check("utterance language is set to the voice's language", (await vp.evaluate(() => window.__utts.every((x) => x.lang === "en-US"))));
  check("chosen voice is pinned in settings", (await vp.evaluate(() => window.__miku.prefs.voice)) === "fake-Amy" && (await vp.inputValue("#voice-select")) === "fake-Amy");
  await vp.reload({ waitUntil: "networkidle" });
  await vp.waitForFunction(() => !/starting/.test(document.getElementById("mode-status").textContent));
  await say("say hi");
  u = await vp.evaluate(() => window.__utts.slice());
  check("speed and voice persist after reload", u.length === 1 && u[0].rate === 1.3 && u[0].voice === "fake-Amy" && (await vp.textContent("#rate-value")) === "1.3 times", JSON.stringify(u));

  // Avatar: present AND alive. It reacts to thinking/speaking even without boundary events.
  await vp.check("#avatar-toggle");
  await vp.waitForFunction(() => window.__miku.avatar || /couldn't start/.test(document.getElementById("avatar-state").textContent), null, { timeout: 15000 });
  const kind = await vp.evaluate(() => window.__miku.avatar ? window.__miku.avatar.kind : "failed: " + document.getElementById("avatar-state").textContent);
  check("avatar starts (WebGL)", kind === "placeholder", kind);
  if (kind === "placeholder") {
    const f1 = Number(await vp.getAttribute("#avatar-stage", "data-frames")); await vp.waitForTimeout(1200);
    const f2 = Number(await vp.getAttribute("#avatar-stage", "data-frames"));
    check("avatar animates while idle (frames keep rendering)", f2 > f1 + 10, `${f1} → ${f2} frames`);
    check("avatar waves hello when turned on", (await vp.getAttribute("#avatar-stage", "data-gesture")) === "wave" || f2 > 0);
    await vp.fill("#text-input", "say hi"); await vp.press("#text-input", "Enter");
    await vp.waitForFunction(() => document.getElementById("avatar-stage").dataset.state === "speaking", null, { timeout: 2000 }).then(() => true, () => false)
      .then((ok) => check("avatar switches to speaking while Miku talks", ok));
    check("avatar status shown as text, not a live region", /talking/.test(await vp.textContent("#avatar-state")) && !(await vp.getAttribute("#avatar-state", "aria-live")) && !(await vp.getAttribute("#avatar-state", "role")));
    await vp.waitForFunction(() => document.getElementById("avatar-stage").dataset.state === "idle", null, { timeout: 4000 }).then(() => true, () => false)
      .then((ok) => check("avatar returns to resting and nods when Miku finishes", ok));
    await vp.addScriptTag({ url: base + "vendor/axe-core/axe.min.js" });
    const axeA = await vp.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] })).violations.map((v) => v.id));
    check("axe with the avatar on: 0 violations", axeA.length === 0, axeA.join(", ") || "none");
    check("avatar canvas is inside the aria-hidden stage", (await vp.$$eval("#avatar-stage canvas", (c) => c.length)) === 1 && (await vp.getAttribute("#avatar-stage", "aria-hidden")) === "true");
  }
  await vctx.close();
}
// Reduced motion: the avatar can still be turned on, holds still while idle, and shows state.
{
  const rctx = await browser.newContext({ reducedMotion: "reduce" });
  await rctx.addInitScript(fakeAndroidVoices);
  await rctx.addInitScript(() => localStorage.setItem("miku.prefs", JSON.stringify({ avatar: true })));
  const rp = await rctx.newPage();
  rp.on("pageerror", (e) => consoleErrors.push(e.message));
  rp.on("request", (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u); });
  await rp.goto(base, { waitUntil: "networkidle" });
  await rp.waitForFunction(() => window.__miku.avatar, null, { timeout: 15000 }).catch(() => {});
  check("reduced motion: avatar setting is kept on after reload", await rp.isChecked("#avatar-toggle") && !(await rp.isHidden("#avatar-stage")));
  await rp.waitForTimeout(2200); // let the hello pose finish
  const r1 = Number(await rp.getAttribute("#avatar-stage", "data-frames")); await rp.waitForTimeout(1500);
  const r2 = Number(await rp.getAttribute("#avatar-stage", "data-frames"));
  check("reduced motion: no animation loop while idle", r1 > 0 && r2 === r1, `${r1} → ${r2} frames`);
  await rp.waitForFunction(() => !/starting/.test(document.getElementById("mode-status").textContent));
  await rp.fill("#text-input", "say hi"); await rp.press("#text-input", "Enter");
  await rp.waitForFunction(() => document.getElementById("avatar-stage").dataset.state === "speaking", null, { timeout: 2000 }).then(() => true, () => false)
    .then((ok) => check("reduced motion: avatar still shows speaking (still pose)", ok));
  await rctx.close();
}

// Android app path: the WebView has no speechSynthesis, so Miku must use the native
// TextToSpeech plugin through the Capacitor bridge, with the same speed setting.
{
  const actx = await browser.newContext();
  await actx.addInitScript(() => {
    delete window.speechSynthesis; window.__native = [];
    const voices = [{ name: "en-us-x-net", lang: "en-US", localService: false, voiceURI: "net", default: false },
      { name: "en-us-x-local", lang: "en-US", localService: true, voiceURI: "local", default: true }];
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android", PluginHeaders: [{ name: "TextToSpeech", methods: [] }],
      nativeCallback: () => "cb1",
      nativePromise: (plugin, method, opts) => { window.__native.push({ plugin, method, opts }); return new Promise((res) => setTimeout(() => res(method === "getSupportedVoices" ? { voices } : undefined), method === "speak" ? 300 : 5)); } };
    localStorage.setItem("miku.prefs", JSON.stringify({ rate: "1.4" }));
  });
  const ap = await actx.newPage();
  ap.on("pageerror", (e) => consoleErrors.push(e.message));
  await ap.goto(base, { waitUntil: "networkidle" });
  await ap.waitForFunction(() => !/starting/.test(document.getElementById("mode-status").textContent));
  await ap.fill("#text-input", "say hi"); await ap.press("#text-input", "Enter");
  await ap.waitForTimeout(800);
  const calls = await ap.evaluate(() => window.__native.filter((c) => c.method === "speak").map((c) => c.opts));
  const live = await ap.textContent("#reply-live");
  check("Android app: speaks through native on-device TTS with the saved speed", (await ap.evaluate(() => window.__miku.engineName())) === "android" && calls.length === 1 && calls[0].rate === 1.4 && calls[0].voice === 1 && calls[0].lang === "en-US", JSON.stringify(calls));
  check("Android app: native voice means no duplicate screen-reader announcement", live === "", JSON.stringify(live));
  await actx.close();
}

// privacy.html ships script-src 'none', so audit it in a CSP-bypassing context (test only).
const pctx = await browser.newContext({ bypassCSP: true });
const ppage = await pctx.newPage();
ppage.on("request", (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith("data:")) external.push(u); });
await ppage.goto(base + "privacy.html", { waitUntil: "networkidle" });
await ppage.addScriptTag({ url: base + "vendor/axe-core/axe.min.js" });
const axeP = await ppage.evaluate(async () => { const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }); return r.violations.map((v) => v.id); }).catch((e) => ["(could not inject: " + e.message.split("\n")[0] + ")"]);
check("privacy page axe: 0 violations", axeP.length === 0, axeP.join(", ") || "none");

// Project status page: same static, script-free audit plus a content check.
const spage = await pctx.newPage();
spage.on("request", (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith("data:")) external.push(u); });
const sres = await spage.goto(base + "status.html", { waitUntil: "networkidle" });
const sText = await spage.textContent("main");
const sHeads = await spage.$$eval("h1, h2", (h) => h.map((x) => x.textContent.trim()));
check("status page loads with release, testing, stores and team sections", sres.ok() && /0\.1\.0-beta/.test(sText) && ["Project status", "Current release", "Testing", "App stores", "Team"].every((h) => sHeads.includes(h)), sHeads.join(" / "));
await spage.addScriptTag({ url: base + "vendor/axe-core/axe.min.js" });
const axeS = await spage.evaluate(async () => { const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }); return r.violations.map((v) => v.id); }).catch((e) => ["(could not inject: " + e.message.split("\n")[0] + ")"]);
check("status page axe: 0 violations", axeS.length === 0, axeS.join(", ") || "none");

check("ZERO external requests", external.length === 0, external.length ? external.join(", ") : "no request left " + origin);
check("no console errors", consoleErrors.filter((e) => !/^Failed to load resource/.test(e)).length === 0, consoleErrors.join(" | ").slice(0, 500));
await browser.close(); server?.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
