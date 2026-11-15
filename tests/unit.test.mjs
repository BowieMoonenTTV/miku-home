import { test } from "node:test";
import assert from "node:assert/strict";
import { localReply } from "../app/js/replies.js";
test("say hi greets Bowie", () => assert.equal(localReply("say hi"), "Hi Bowie, it's Miku."));
test("empty input asks to type", () => assert.match(localReply(""), /type instead/));
test("home controls explain the add-on", () => assert.match(localReply("turn on the lights"), /Home Assistant/));
test("time reply", () => assert.match(localReply("what time is it", { now: new Date(2026, 9, 25, 20, 5) }), /^It's /));

// ---- Voice speed and voice choice (tts.js) ----
import { clampRate, pickVoice, chunkText, DEFAULT_RATE } from "../app/js/tts.js";
test("speed: missing or invalid saved speed uses the default", () => {
  for (const v of [undefined, null, "", "abc", NaN]) assert.equal(clampRate(v), DEFAULT_RATE);
});
test("speed: string from the slider becomes a number, clamped to 0.5–1.6", () => {
  assert.equal(clampRate("1.2"), 1.2); assert.equal(clampRate(0.1), 0.5); assert.equal(clampRate(9), 1.6);
});
const V = (name, lang, extra = {}) => ({ name, lang, voiceURI: name.toLowerCase().replace(/\s/g, "-"), localService: true, ...extra });
test("voice: same voices in any order give the same voice", () => {
  const list = [V("Zed", "en-GB"), V("Amy", "en-US"), V("Bob", "en-US"), V("Fr", "fr-FR")];
  const a = pickVoice(list).voiceURI, b = pickVoice([...list].reverse()).voiceURI;
  assert.equal(a, b); assert.equal(a, "amy");
});
test("voice: saved voice wins, then the device's default English voice", () => {
  const list = [V("Amy", "en-US"), V("Dee", "en-AU", { default: true })];
  assert.equal(pickVoice(list, "amy").voiceURI, "amy");
  assert.equal(pickVoice(list).voiceURI, "dee");
  assert.equal(pickVoice(list, "gone").voiceURI, "dee");
  assert.equal(pickVoice([]), null);
});
test("long replies are split into short chunks, short ones are not", () => {
  assert.deepEqual(chunkText("Hi Bowie, it's Miku."), ["Hi Bowie, it's Miku."]);
  const long = "This is one sentence that goes on for a while. ".repeat(12);
  const parts = chunkText(long);
  assert.ok(parts.length > 1 && parts.every((p) => p.length <= 180));
  assert.equal(parts.join(" ").replace(/\s+/g, " "), long.trim().replace(/\s+/g, " "));
});

// ---- Avatar body language (avatar-motion.js) ----
import { createMotion, EVENT_GESTURE } from "../app/js/avatar-motion.js";
const run = (m, secs) => { let last; for (let t = 0; t < secs; t += 0.05) last = m.update(0.05); return last; };
test("avatar: idle breathing moves the pose and blinks happen on a timer", () => {
  const m = createMotion({ random: () => 0.5 });
  const poses = []; let blinked = false;
  for (let i = 0; i < 200; i++) { const { pose } = m.update(0.05); poses.push(pose.bodyY); if (pose.eyeOpen < 0.5) blinked = true; }
  assert.ok(new Set(poses.map((p) => p.toFixed(4))).size > 10, "idle pose changes over time");
  assert.ok(blinked, "blinks within 10 seconds");
});
test("avatar: app events play their gestures", () => {
  const m = createMotion({ random: () => 0.99 });
  m.setState("listening"); assert.equal(m.gesture, EVENT_GESTURE.listening);
  run(m, 2); m.setState("thinking"); assert.equal(m.gesture, EVENT_GESTURE.thinking);
  run(m, 2); m.setState("speaking");
  const { pose } = m.update(0.05); assert.ok(pose.mouth > 0, "mouth moves while speaking");
  m.setState("idle"); assert.equal(m.gesture, EVENT_GESTURE.doneSpeaking);
  assert.ok(m.trigger("wave")); const w = run(m, 0.4); assert.ok(w.pose.armRaise > 0.5, "wave raises the arm");
});
test("avatar: mouth follows lip-sync visemes while speaking", () => {
  const m = createMotion(); m.setState("speaking"); m.viseme(1);
  assert.ok(m.update(0.01).pose.mouth > 0.9);
});
test("avatar reduced motion: still poses only, no idle movement, no blinking, nothing oscillates", () => {
  const m = createMotion({ reducedMotion: true, random: () => 0 });
  const idle = []; for (let i = 0; i < 300; i++) idle.push(JSON.stringify(m.update(0.05).pose));
  assert.equal(new Set(idle).size, 1, "idle pose never changes");
  assert.equal(m.trigger("blink"), false);
  m.setState("speaking"); const a = m.update(0.05).pose.mouth, b = run(m, 1).pose.mouth;
  assert.ok(a > 0 && a === b, "speaking is a held, still mouth pose");
  m.trigger("wave"); const w = []; for (let i = 0; i < 20; i++) w.push(m.update(0.05).pose.armRaise);
  assert.ok(w.every((x) => x === 1), "wave is a held raised hand, no waving");
});
test("avatar reduced motion: redraws only when something changed", () => {
  const m = createMotion({ reducedMotion: true });
  m.update(0.05); assert.equal(m.update(0.05).dirty, false);
  m.setState("listening"); assert.equal(m.update(0.05).dirty, true);
});

// ---- Android versionCode (mobile/version-code.mjs) ----
import { versionCode } from "../mobile/version-code.mjs";
test("versionCode: known values", () => {
  assert.equal(versionCode("0.1.0-beta"), 10030);
  assert.equal(versionCode("0.1.0-beta.1"), 10031);
  assert.equal(versionCode("0.1.0"), 10099);
  assert.equal(versionCode("1.0.0"), 1000099);
});
test("versionCode: always above 100 (the first public APK) and rising", () => {
  const order = ["0.0.1-alpha", "0.1.0-alpha", "0.1.0-beta", "0.1.0-beta.1", "0.1.0-beta.19", "0.1.0-rc", "0.1.0-rc.2", "0.1.0", "0.1.1-beta", "0.2.0", "1.0.0", "2099.99.99"];
  const codes = order.map(versionCode);
  for (let i = 0; i < codes.length; i++) {
    assert.ok(codes[i] > 100, `${order[i]} gives ${codes[i]}`);
    if (i) assert.ok(codes[i] > codes[i - 1], `${order[i]} must be above ${order[i - 1]}`);
  }
  assert.ok(versionCode("2099.99.99") <= 2_100_000_000);
});
test("versionCode: the current mobile version is supported", async () => {
  const { readFileSync } = await import("node:fs");
  const v = JSON.parse(readFileSync(new URL("../mobile/package.json", import.meta.url))).version;
  assert.ok(versionCode(v) > 100);
});
test("versionCode: bad versions are refused", () => {
  for (const v of ["1.0", "1.0.0-dev", "0.100.0", "0.1.0-beta.20", "v1.0.0"]) assert.throws(() => versionCode(v));
});
