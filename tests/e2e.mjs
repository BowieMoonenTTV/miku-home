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
check("caption log is aria-live polite", (await page.getAttribute("#caption-log", "aria-live")) === "polite");
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
    await page.waitForFunction(() => /Listening\. Press Stop/.test(document.getElementById("stt-status").textContent), null, { timeout: 120000 });
    check("on-device Vosk model loads and listening starts", true, await page.textContent("#stt-status"));
    await page.waitForTimeout(1500);
    await page.click("#speak-btn");
    await page.waitForFunction(() => !/Processing/.test(document.getElementById("stt-status").textContent), null, { timeout: 15000 });
    check("listening stops cleanly", true, await page.textContent("#stt-status"));
  } catch (e) { check("on-device Vosk model loads and listening starts", false, (await page.textContent("#stt-status")) + " " + e.message.split("\n")[0]); }
}

await page.addScriptTag({ url: base + "vendor/axe-core/axe.min.js" });
const axe = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] }); return { v: r.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`), passes: r.passes.length, incomplete: r.incomplete.map((i) => i.id) }; });
check("axe-core WCAG 2.2 AA + best practice: 0 violations", axe.v.length === 0, `${axe.passes} rules passed; violations: ${axe.v.join(", ") || "none"}; needs review: ${axe.incomplete.join(", ") || "none"}`);

// privacy.html ships script-src 'none', so audit it in a CSP-bypassing context (test only).
const pctx = await browser.newContext({ bypassCSP: true });
const ppage = await pctx.newPage();
ppage.on("request", (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith("data:")) external.push(u); });
await ppage.goto(base + "privacy.html", { waitUntil: "networkidle" });
await ppage.addScriptTag({ url: base + "vendor/axe-core/axe.min.js" });
const axeP = await ppage.evaluate(async () => { const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }); return r.violations.map((v) => v.id); }).catch((e) => ["(could not inject: " + e.message.split("\n")[0] + ")"]);
check("privacy page axe: 0 violations", axeP.length === 0, axeP.join(", ") || "none");

check("ZERO external requests", external.length === 0, external.length ? external.join(", ") : "no request left " + origin);
check("no console errors", consoleErrors.filter((e) => !/^Failed to load resource/.test(e)).length === 0, consoleErrors.join(" | ").slice(0, 500));
await browser.close(); server?.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
