import { config } from "./config.js";
import { localReply } from "./replies.js";
import { speak, stopSpeaking, whenVoicesReady, localVoices, pickVoice, clampRate, engineName } from "./tts.js";
import { sttSupported, startListening } from "./stt.js";
import { installLocalCrashLog, logAsText, clearLog, record } from "./crash.js";

installLocalCrashLog();
const $ = (id) => document.getElementById(id);
const els = {
  mode: $("mode-status"), speak: $("speak-btn"), speakState: document.querySelector(".speak-state"), input: $("text-input"), send: $("send-btn"),
  log: $("caption-log"), repeat: $("repeat-btn"), clear: $("clear-btn"), voice: $("voice-select"), rate: $("rate-input"),
  rateOut: $("rate-value"), speakToggle: $("speak-toggle"), srToggle: $("sr-toggle"), replyLive: $("reply-live"), avatarToggle: $("avatar-toggle"), stage: $("avatar-stage"),
  axe: $("axe-btn"), axeOut: $("axe-result"), sttStatus: $("stt-status"), crashView: $("crash-view"), crashText: $("crash-text"),
  crashCopy: $("crash-copy"), crashExport: $("crash-export"), crashClear: $("crash-clear"), haToken: $("ha-token"), haSave: $("ha-save"), avatarState: $("avatar-state"),
};
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let lastReply = "";
let stopRec = null;
let avatar = null;
let haMod = null;

const prefs = JSON.parse(localStorage.getItem("miku.prefs") || "{}");
function savePrefs() { localStorage.setItem("miku.prefs", JSON.stringify(prefs)); }

function addCaption(who, text) {
  const li = document.createElement("li");
  const w = document.createElement("span"); w.className = "who"; w.textContent = who + ": ";
  const t = document.createElement("span"); t.textContent = text;
  const time = document.createElement("time"); const now = new Date(); time.dateTime = now.toISOString();
  time.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  li.append(w, t, time); els.log.append(li);
  els.log.scrollTop = els.log.scrollHeight;
}

async function getReply(text) {
  if (haMod && haMod.haConfigured(config)) {
    try { return await haMod.haConverse(config, text); } catch (e) { record("ha", e.message); }
  }
  if (config.ollamaUrl) {
    try {
      const r = await fetch(new URL("/api/generate", config.ollamaUrl), { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: config.ollamaModel, prompt: `You are ${config.assistantName}, a kind, brief home assistant for ${config.userName}, who is blind. Answer in one or two short sentences.\n\nUser: ${text}`, stream: false }) });
      if (r.ok) { const j = await r.json(); if (j.response) return j.response.trim(); }
    } catch (e) { record("ollama", e.message); }
  }
  return localReply(text, { name: config.userName, assistant: config.assistantName });
}

// Avatar state, shown as plain visible text next to the (aria-hidden) avatar. It is not a
// live region, so screen readers are not interrupted; captions carry the real content.
const AVATAR_TEXT = { idle: "Avatar: resting.", listening: "Avatar: listening.", thinking: "Avatar: thinking.", speaking: "Avatar: talking." };
let avatarTimer = null;
function avatarState(s) {
  clearTimeout(avatarTimer);
  if (avatar) avatar.setState(s);
  if (els.avatarState && !els.avatarState.hidden) els.avatarState.textContent = AVATAR_TEXT[s] || AVATAR_TEXT.idle;
}
const isGreeting = (t) => /^\s*(say\s+)?(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(t);

async function handle(text) {
  text = String(text || "").trim();
  if (!text) return;
  addCaption(config.userName, text);
  avatarState("thinking");
  const reply = await getReply(text);
  if (avatar && isGreeting(text)) avatar.gesture("wave");
  respond(reply);
}

// Screen reader announcement for replies. The visible caption log is NOT a live region, so a
// reply is announced only here, and only when Miku's own voice is not already speaking it.
let liveTimer = null;
function announce(text) {
  clearTimeout(liveTimer);
  els.replyLive.textContent = "";
  // Re-set after a short delay so a repeated, identical reply is still announced.
  // setTimeout, not requestAnimationFrame: animation frames pause in background or hidden windows.
  setTimeout(() => { els.replyLive.textContent = text; }, 100);
  // Clear afterwards so the hidden copy does not show up twice when browsing the page.
  liveTimer = setTimeout(() => { els.replyLive.textContent = ""; }, 7000);
}

// The ONE place Miku speaks. Every reply (typed, spoken, repeated) uses the same saved
// speed and the same voice, so the speaking speed is the same everywhere in the app.
function respond(reply) {
  lastReply = reply;
  addCaption(config.assistantName, reply);
  const rate = clampRate(prefs.rate);
  if (avatar) avatar.setRate(rate);
  const appVoice = els.speakToggle.checked && !els.srToggle.checked && speak(reply, {
    voiceURI: prefs.voice, rate,
    onStart: () => avatarState("speaking"),
    onBoundary: (e) => { if (avatar && e.name === "word") avatar.sayWord(reply.substr(e.charIndex, e.charLength || reply.slice(e.charIndex).search(/\s|$/))); },
    onEnd: () => avatarState("idle"),
    onError: (err) => { record("tts", (err && (err.error || err.message)) || "speech failed"); avatarState("idle"); announce(config.assistantName + ": " + reply); },
  });
  if (appVoice) { avatarState("speaking"); return; }
  announce(config.assistantName + ": " + reply);
  // No app voice (screen reader mode, voice off, or no on-device voice): the avatar still
  // "talks" for about as long as the reply takes to read, then rests.
  avatarState("speaking");
  const words = reply.split(/\s+/).filter(Boolean).length;
  avatarTimer = setTimeout(() => avatarState("idle"), Math.min(8000, 600 + words * 330 / rate));
}

function setListening(on) {
  els.speak.setAttribute("aria-pressed", on ? "true" : "false");
  // The accessible name stays "Speak"; state is exposed only through aria-pressed.
  els.speakState.textContent = on ? "Listening, press again to stop" : "";
  avatarState(on ? "listening" : "idle");
}

async function toggleListening() {
  if (stopRec) { const s = stopRec; stopRec = null; setListening(false); els.sttStatus.textContent = "Processing what you said…"; await s(); return; }
  if (!sttSupported()) { els.sttStatus.textContent = "Voice input isn't available in this browser or page. Please type instead."; els.input.focus(); return; }
  stopSpeaking();
  try {
    setListening(true);
    stopRec = await startListening({
      onStatus: (m) => { els.sttStatus.textContent = m; },
      onPartial: () => { els.sttStatus.textContent = "Listening…"; },
      onFinal: (t) => { els.sttStatus.textContent = t ? "Heard you." : "I didn't hear anything. You can type instead."; if (t) handle(t); },
    });
    els.sttStatus.textContent = "Listening. Press Speak again when you're done.";
  } catch (e) {
    stopRec = null; setListening(false); record("stt", e.message);
    els.sttStatus.textContent = "Voice input couldn't start (" + (e.name === "NotAllowedError" ? "microphone permission was denied" : e.message) + "). Please type instead.";
    els.input.focus();
  }
}

function sendTyped() { const v = els.input.value; els.input.value = ""; handle(v); }

els.speak.addEventListener("click", toggleListening);
els.send.addEventListener("click", sendTyped);
els.input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); sendTyped(); } });
els.repeat.addEventListener("click", () => { if (lastReply) respond(lastReply); else els.sttStatus.textContent = "There's no reply to repeat yet."; });
els.clear.addEventListener("click", () => { els.log.textContent = ""; els.sttStatus.textContent = "Captions cleared."; });
// One speaking-speed setting, saved on this device, applied to every utterance.
prefs.rate = clampRate(prefs.rate);
els.rate.value = String(prefs.rate); els.rateOut.textContent = prefs.rate.toFixed(1) + " times";
els.rate.addEventListener("input", () => { prefs.rate = clampRate(els.rate.value); els.rateOut.textContent = prefs.rate.toFixed(1) + " times"; savePrefs(); });
els.srToggle.checked = prefs.sr === true;
els.speakToggle.checked = prefs.speak !== false && !els.srToggle.checked;
els.speakToggle.addEventListener("change", () => {
  prefs.speak = els.speakToggle.checked;
  if (els.speakToggle.checked && els.srToggle.checked) { els.srToggle.checked = false; prefs.sr = false; }
  savePrefs();
});
els.srToggle.addEventListener("change", () => {
  prefs.sr = els.srToggle.checked;
  if (els.srToggle.checked) { stopSpeaking(); els.speakToggle.checked = false; prefs.speak = false; }
  savePrefs();
  els.sttStatus.textContent = els.srToggle.checked ? "Your screen reader will read replies. Miku's voice is off." : "Your screen reader will no longer read replies.";
});
els.voice.addEventListener("change", () => { prefs.voice = els.voice.value; savePrefs(); });

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { stopSpeaking(); avatarState("idle"); if (stopRec) toggleListening(); return; }
  if (!(e.altKey && e.shiftKey)) return;
  const k = e.code;
  if (k === "KeyS") { e.preventDefault(); toggleListening(); }
  else if (k === "KeyT") { e.preventDefault(); els.input.focus(); }
  else if (k === "KeyL") { e.preventDefault(); $("captions-heading").focus(); }
  else if (k === "KeyR") { e.preventDefault(); els.repeat.click(); }
});

// Avatar is opt-in and decorative. Reduced motion no longer switches it off (that left it
// unchecked on every load); it gets calm, still poses instead of animation.
els.avatarToggle.checked = !!prefs.avatar;
function showAvatarUi(on) { els.stage.hidden = !on; els.avatarState.hidden = !on; if (on) els.avatarState.textContent = AVATAR_TEXT[avatar ? avatar.state : "idle"]; }
showAvatarUi(els.avatarToggle.checked);
let avatarLoading = null;
async function ensureAvatar() {
  if (avatar || !els.avatarToggle.checked) return;
  if (avatarLoading) return avatarLoading;
  avatarLoading = (async () => {
    try {
      const m = await import("./avatar.js");
      avatar = await m.createAvatar(els.stage, { vrmPath: config.vrmPath, reducedMotion });
      avatar.setRate(clampRate(prefs.rate));
      avatar.gesture("wave"); // hello
    } catch (e) {
      record("avatar", e.message); els.stage.hidden = true;
      els.avatarState.hidden = false; els.avatarState.textContent = "The avatar couldn't start on this device. Everything else works; captions are unchanged.";
    } finally { avatarLoading = null; }
  })();
  return avatarLoading;
}
els.avatarToggle.addEventListener("change", () => { prefs.avatar = els.avatarToggle.checked; savePrefs(); showAvatarUi(els.avatarToggle.checked); ensureAvatar(); });
ensureAvatar();

// Local crash log
function refreshCrash() { els.crashText.value = logAsText(); }
els.crashView.addEventListener("toggle", refreshCrash);
els.crashCopy.addEventListener("click", async () => { refreshCrash(); try { await navigator.clipboard.writeText(els.crashText.value); els.sttStatus.textContent = "Error log copied."; } catch { els.crashText.select(); els.sttStatus.textContent = "Select-all done; copy with Control C."; } });
els.crashExport.addEventListener("click", () => { refreshCrash(); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([els.crashText.value], { type: "text/plain" })); a.download = "miku-home-error-log.txt"; a.click(); URL.revokeObjectURL(a.href); });
els.crashClear.addEventListener("click", () => { clearLog(); refreshCrash(); els.sttStatus.textContent = "Error log cleared."; });

// Home Assistant token (stored only on this device)
els.haSave.addEventListener("click", () => { const v = els.haToken.value.trim(); if (v) localStorage.setItem("miku.haToken", v); else localStorage.removeItem("miku.haToken"); els.haToken.value = ""; els.sttStatus.textContent = v ? "Home Assistant token saved on this device only." : "Home Assistant token removed."; detectMode(); });

// In-app accessibility check (vendored axe-core, runs locally)
els.axe.addEventListener("click", async () => {
  els.axeOut.textContent = "Checking…";
  if (!window.axe) await new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/axe-core/axe.min.js"; s.onload = res; s.onerror = rej; document.head.append(s); });
  const r = await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] });
  els.axeOut.textContent = r.violations.length ? `${r.violations.length} issue types found: ${r.violations.map((v) => v.id).join(", ")}` : `No automatic accessibility issues found (${r.passes.length} checks passed).`;
});

async function detectMode() {
  const parts = [];
  if (config.haUrl && localStorage.getItem("miku.haToken")) { try { haMod = await import("./ha.js"); parts.push("Home Assistant"); } catch (e) { record("ha", e.message); } }
  if (config.ollamaUrl) parts.push("Ollama brain");
  const voices = await whenVoicesReady();
  els.voice.textContent = "";
  if (!voices.length) { const o = new Option("No on-device voice found: captions only", ""); els.voice.add(o); }
  // Pin one voice once voices have loaded, so every reply uses the same voice (and so the
  // same natural speed) instead of whichever voice happened to load first.
  const chosen = pickVoice(voices, prefs.voice);
  if (chosen && chosen.voiceURI !== prefs.voice) { prefs.voice = chosen.voiceURI; savePrefs(); }
  const sorted = [...voices].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  for (const v of sorted) { const o = new Option(`${v.name} (${v.lang})`, v.voiceURI); if (chosen && v.voiceURI === chosen.voiceURI) o.selected = true; els.voice.add(o); }
  const listen = sttSupported() ? "Listening: on this device" : "Listening: not available here, type instead";
  els.mode.textContent = `Mode: ${parts.length ? parts.join(" + ") : "Standalone"}. ${voices.length ? "Spoken replies: on-device voice" : "Spoken replies: off, no on-device voice found, captions only"}. ${listen}.`;
}
detectMode();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch((e) => record("sw", e.message));
}
window.__miku = { handle, localVoices, engineName, get avatar() { return avatar; }, get prefs() { return { ...prefs }; } };
