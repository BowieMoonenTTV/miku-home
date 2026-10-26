import { config } from "./config.js";
import { localReply } from "./replies.js";
import { speak, stopSpeaking, whenVoicesReady, localVoices } from "./tts.js";
import { sttSupported, startListening } from "./stt.js";
import { installLocalCrashLog, logAsText, clearLog, record } from "./crash.js";

installLocalCrashLog();
const $ = (id) => document.getElementById(id);
const els = {
  mode: $("mode-status"), speak: $("speak-btn"), speakState: document.querySelector(".speak-state"), input: $("text-input"), send: $("send-btn"),
  log: $("caption-log"), repeat: $("repeat-btn"), clear: $("clear-btn"), voice: $("voice-select"), rate: $("rate-input"),
  rateOut: $("rate-value"), speakToggle: $("speak-toggle"), srToggle: $("sr-toggle"), replyLive: $("reply-live"), avatarToggle: $("avatar-toggle"), stage: $("avatar-stage"),
  axe: $("axe-btn"), axeOut: $("axe-result"), sttStatus: $("stt-status"), crashView: $("crash-view"), crashText: $("crash-text"),
  crashCopy: $("crash-copy"), crashExport: $("crash-export"), crashClear: $("crash-clear"), haToken: $("ha-token"), haSave: $("ha-save"),
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

async function handle(text) {
  text = String(text || "").trim();
  if (!text) return;
  addCaption(config.userName, text);
  const reply = await getReply(text);
  respond(reply);
}

// Screen reader announcement for replies. The visible caption log is NOT a live region, so a
// reply is announced only here, and only when Miku's own voice is not already speaking it.
let liveTimer = null;
function announce(text) {
  clearTimeout(liveTimer);
  els.replyLive.textContent = "";
  // Re-set on the next frame so a repeated, identical reply is still announced.
  requestAnimationFrame(() => { els.replyLive.textContent = text; });
  // Clear afterwards so the hidden copy does not show up twice when browsing the page.
  liveTimer = setTimeout(() => { els.replyLive.textContent = ""; }, 7000);
}

function respond(reply) {
  lastReply = reply;
  addCaption(config.assistantName, reply);
  const appVoice = els.speakToggle.checked && !els.srToggle.checked && speak(reply, {
    voiceURI: prefs.voice, rate: Number(prefs.rate || 1),
    onBoundary: (e) => { if (avatar && e.name === "word") avatar.sayWord(reply.substr(e.charIndex, e.charLength || reply.slice(e.charIndex).search(/\s|$/))); },
  });
  if (!appVoice) announce(config.assistantName + ": " + reply);
}

function setListening(on) {
  els.speak.setAttribute("aria-pressed", on ? "true" : "false");
  // The accessible name stays "Speak"; state is exposed only through aria-pressed.
  els.speakState.textContent = on ? "Listening, press again to stop" : "";
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
els.rate.value = prefs.rate || "1"; els.rateOut.textContent = Number(els.rate.value).toFixed(1) + " times";
els.rate.addEventListener("input", () => { prefs.rate = els.rate.value; els.rateOut.textContent = Number(els.rate.value).toFixed(1) + " times"; savePrefs(); });
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
  if (e.key === "Escape") { stopSpeaking(); if (stopRec) toggleListening(); return; }
  if (!(e.altKey && e.shiftKey)) return;
  const k = e.code;
  if (k === "KeyS") { e.preventDefault(); toggleListening(); }
  else if (k === "KeyT") { e.preventDefault(); els.input.focus(); }
  else if (k === "KeyL") { e.preventDefault(); $("captions-heading").focus(); }
  else if (k === "KeyR") { e.preventDefault(); els.repeat.click(); }
});

// Avatar is opt-in and decorative.
els.avatarToggle.checked = !!prefs.avatar && !reducedMotion;
els.stage.hidden = !els.avatarToggle.checked;
async function ensureAvatar() {
  if (avatar || !els.avatarToggle.checked) return;
  try { const m = await import("./avatar.js"); avatar = await m.createAvatar(els.stage, { vrmPath: config.vrmPath, reducedMotion }); }
  catch (e) { record("avatar", e.message); els.stage.hidden = true; }
}
els.avatarToggle.addEventListener("change", () => { prefs.avatar = els.avatarToggle.checked; savePrefs(); els.stage.hidden = !els.avatarToggle.checked; ensureAvatar(); });
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
  for (const v of voices) { const o = new Option(`${v.name} (${v.lang})`, v.voiceURI); if (v.voiceURI === prefs.voice) o.selected = true; els.voice.add(o); }
  const listen = sttSupported() ? "Listening: on this device" : "Listening: not available here, type instead";
  els.mode.textContent = `Mode: ${parts.length ? parts.join(" + ") : "Standalone"}. ${voices.length ? "Spoken replies: on-device voice" : "Spoken replies: off, no on-device voice found, captions only"}. ${listen}.`;
}
detectMode();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch((e) => record("sw", e.message));
}
window.__miku = { handle, localVoices };
