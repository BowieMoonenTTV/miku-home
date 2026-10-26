// Text to speech using ONLY on-device voices.
//   Browser / PWA / desktop: Web Speech API, voices with localService === true.
//     Network voices (for example "Google US English" in Chrome) are never used.
//   Android app (Capacitor WebView): the Android System WebView has no Web Speech API,
//     so the app uses Android's own TextToSpeech engine through the bundled
//     @capacitor-community/text-to-speech plugin, again with on-device voices only.
// Every utterance, on every screen and in every app, goes through speak() below, so
// one saved speed setting and one deterministically chosen voice apply to all of it.

export const DEFAULT_RATE = 1;
export const MIN_RATE = 0.5;
export const MAX_RATE = 1.6;
const MAX_CHUNK = 180; // long utterances are split: Chrome cuts off or drifts on long text

/** Clamp a saved or typed speed to the slider range; anything invalid becomes the default. */
export function clampRate(r) {
  const n = Number(r);
  if (r === null || r === undefined || r === "" || !Number.isFinite(n)) return DEFAULT_RATE;
  return Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, n)) * 10) / 10;
}

/**
 * Choose a voice deterministically. Same list + same preference = same voice, no matter
 * the order the browser returns voices in or how many times voiceschanged fires.
 * 1. the saved voice, 2. the device's default English voice, 3. en-US, 4. any English,
 * 5. anything; ties broken by name.
 */
export function pickVoice(voices, preferredURI) {
  if (!voices || !voices.length) return null;
  const sorted = [...voices].sort((a, b) => String(a.name).localeCompare(String(b.name)) || String(a.voiceURI).localeCompare(String(b.voiceURI)));
  const en = (v) => /^en\b|^en[-_]/i.test(v.lang || "");
  return (preferredURI && sorted.find((v) => v.voiceURI === preferredURI))
    || sorted.find((v) => v.default && en(v))
    || sorted.find((v) => /^en[-_]US$/i.test(v.lang || ""))
    || sorted.find(en)
    || sorted[0];
}

/** Split text into sentence-sized chunks no longer than max characters. */
export function chunkText(text, max = MAX_CHUNK) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const out = [];
  let cur = "";
  for (const s of clean.match(/[^.!?;:]+[.!?;:]*\s*/g) || [clean]) {
    let piece = s.trim();
    while (piece.length > max) { // a single very long sentence: break on the last space
      const cut = piece.lastIndexOf(" ", max) > 0 ? piece.lastIndexOf(" ", max) : max;
      if (cur) { out.push(cur); cur = ""; }
      out.push(piece.slice(0, cut).trim()); piece = piece.slice(cut).trim();
    }
    if (!piece) continue;
    if ((cur + " " + piece).trim().length > max) { if (cur) out.push(cur); cur = piece; }
    else cur = (cur + " " + piece).trim();
  }
  if (cur) out.push(cur);
  return out;
}

// ---------- engines ----------
function nativeBridge() {
  const cap = globalThis.window && window.Capacitor;
  if (!cap || typeof cap.nativePromise !== "function") return null;
  const native = typeof cap.isNativePlatform === "function" ? cap.isNativePlatform() : cap.getPlatform && cap.getPlatform() !== "web";
  if (!native) return null;
  const headers = cap.PluginHeaders || [];
  if (headers.length && !headers.some((h) => h.name === "TextToSpeech")) return null;
  return cap;
}
export function engineName() {
  if (nativeBridge()) return "android";
  return globalThis.window && "speechSynthesis" in window ? "web" : "none";
}

let nativeVoices = []; // [{name, lang, voiceURI, localService, default, index}]
export function localVoices() {
  if (nativeBridge()) return nativeVoices;
  if (!(globalThis.window && "speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.localService);
}

/** Resolves once voices have loaded (they load asynchronously, especially on Android). */
export async function whenVoicesReady({ timeout = 3000 } = {}) {
  const cap = nativeBridge();
  if (cap) {
    for (let i = 0; i < 10 && !nativeVoices.length; i++) {
      try {
        const r = await cap.nativePromise("TextToSpeech", "getSupportedVoices", {});
        nativeVoices = (r && r.voices || []).map((v, index) => ({ ...v, index })).filter((v) => v.localService);
      } catch { /* engine still starting */ }
      if (!nativeVoices.length) await new Promise((res) => setTimeout(res, 300));
    }
    return nativeVoices;
  }
  if (!(globalThis.window && "speechSynthesis" in window)) return [];
  return new Promise((resolve) => {
    let done = false, poll = null, settle = null;
    const finish = () => { if (done) return; done = true; clearInterval(poll); clearTimeout(settle); speechSynthesis.removeEventListener?.("voiceschanged", onChange); resolve(localVoices()); };
    // Android Chrome fires voiceschanged several times while voices trickle in; wait for the list to settle.
    const onChange = () => { clearTimeout(settle); settle = setTimeout(finish, 250); };
    speechSynthesis.addEventListener?.("voiceschanged", onChange);
    if (localVoices().length) onChange();
    poll = setInterval(() => { if (localVoices().length) onChange(); }, 250);
    setTimeout(finish, timeout);
  });
}

let session = 0;
let nativeRangeListener = null; // callback id of the onRangeStart listener
let nativeRangeHandler = null;

/**
 * Speak text with the one saved speed and the deterministically chosen voice.
 * Returns true if an on-device voice is speaking it, false if there is none (captions only).
 * Callbacks: onStart(), onBoundary({ name: "word", charIndex, charLength }) with indexes
 * into the original text, onEnd(), onError(err).
 */
export function speak(text, { voiceURI, rate, onStart, onBoundary, onEnd, onError } = {}) {
  const voices = localVoices();
  const voice = pickVoice(voices, voiceURI);
  const chunks = chunkText(text);
  if (!voice || !chunks.length) { onEnd && onEnd(); return false; }
  const r = clampRate(rate);
  const id = ++session;
  const original = String(text);
  // Map chunk-relative boundaries back to the original text (best effort).
  const offsets = []; { let from = 0; for (const c of chunks) { const at = original.indexOf(c.split(" ")[0], from); offsets.push(at < 0 ? from : at); from = (at < 0 ? from : at) + c.length; } }
  let ended = false;
  const end = (err) => { if (ended || id !== session) return; ended = true; err ? (onError ? onError(err) : onEnd && onEnd()) : onEnd && onEnd(); };
  const cap = nativeBridge();

  if (cap) {
    if (onBoundary && !nativeRangeListener) {
      try { nativeRangeListener = cap.nativeCallback("TextToSpeech", "addListener", { eventName: "onRangeStart" }, (info) => { if (nativeRangeHandler && info) nativeRangeHandler(info); }); } catch { /* optional */ }
    }
    (async () => {
      try { await cap.nativePromise("TextToSpeech", "stop", {}); } catch { /* nothing playing */ }
      if (id !== session) return;
      onStart && onStart();
      for (let i = 0; i < chunks.length; i++) {
        if (id !== session) return;
        nativeRangeHandler = (info) => { if (id === session && onBoundary) onBoundary({ name: "word", charIndex: offsets[i] + info.start, charLength: info.end - info.start }); };
        try {
          await cap.nativePromise("TextToSpeech", "speak", { text: chunks[i], lang: voice.lang || "en-US", rate: r, pitch: 1, volume: 1, voice: voice.index, queueStrategy: 0 });
        } catch (e) { return end(e); }
      }
      end();
    })();
    return true;
  }

  const synth = window.speechSynthesis;
  const make = (chunk, i) => {
    const u = new SpeechSynthesisUtterance(chunk);
    // Set voice AND lang: on Android Chrome the voice alone is sometimes ignored and the
    // engine default (with a different natural speed) is used instead.
    u.voice = voice; u.lang = voice.lang || "en-US";
    u.rate = r; u.pitch = 1; u.volume = 1;
    if (i === 0) u.onstart = () => { if (id === session) onStart && onStart(); };
    if (onBoundary) u.onboundary = (e) => { if (id === session && e.name === "word") onBoundary({ name: "word", charIndex: offsets[i] + e.charIndex, charLength: e.charLength || 0 }); };
    u.onend = () => { if (id !== session) return; if (i === chunks.length - 1) end(); };
    u.onerror = (e) => { if (id !== session) return; if (e && (e.error === "interrupted" || e.error === "canceled")) return; end(e); };
    return u;
  };
  const busy = synth.speaking || synth.pending;
  synth.cancel();
  // Chrome (especially Android) can drop, or reset the settings of, an utterance queued in
  // the same tick as cancel(). Give the engine a moment when something was playing.
  const go = () => { if (id !== session) return; chunks.forEach((c, i) => synth.speak(make(c, i))); };
  if (busy) setTimeout(go, 60); else go();
  return true;
}

export function stopSpeaking() {
  session++;
  const cap = nativeBridge();
  if (cap) { cap.nativePromise("TextToSpeech", "stop", {}).catch(() => {}); return; }
  if (globalThis.window && "speechSynthesis" in window) speechSynthesis.cancel();
}
