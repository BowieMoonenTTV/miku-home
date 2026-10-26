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
