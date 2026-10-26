// On-device speech recognition with Vosk (vosk-browser, WASM). The model is served from
// this app's own origin. No audio ever leaves the device.
// The model is stored as numbered parts (under 5 MB each) so any static host can serve it.
// scripts/split-model.mjs creates the parts and models/model.json lists them.
const MODEL_INDEX = "models/model.json";
let modelPromise = null;
let Vosk = null;

async function loadVoskLib() {
  if (Vosk) return Vosk;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "vendor/vosk-browser/vosk.js";
    s.onload = resolve; s.onerror = () => reject(new Error("Could not load the speech engine"));
    document.head.append(s);
  });
  Vosk = window.Vosk;
  return Vosk;
}
export function sttSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.WebAssembly && window.AudioContext && window.isSecureContext);
}
export async function loadModel(onStatus) {
  if (!modelPromise) {
    modelPromise = (async () => {
      onStatus && onStatus("Loading the on-device speech model, about 40 MB, once.");
      const V = await loadVoskLib();
      const index = await (await fetch(MODEL_INDEX)).json();
      const parts = await Promise.all(index.parts.map(async (p) => {
        const r = await fetch("models/" + p);
        if (!r.ok) throw new Error("Speech model part missing: " + p);
        return r.blob();
      }));
      const blob = new Blob(parts, { type: "application/gzip" });
      if (blob.size !== index.size) throw new Error("Speech model download incomplete");
      const url = URL.createObjectURL(blob);
      const model = await V.createModel(url);
      onStatus && onStatus("Speech model ready.");
      return model;
    })().catch((e) => { modelPromise = null; throw e; });
  }
  return modelPromise;
}
export async function startListening({ onPartial, onFinal, onStatus }) {
  const model = await loadModel(onStatus);
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  const ctx = new AudioContext();
  const rec = new model.KaldiRecognizer(ctx.sampleRate);
  let text = "";
  rec.on("result", (m) => { const t = m.result && m.result.text; if (t) text = (text + " " + t).trim(); });
  rec.on("partialresult", (m) => { const p = m.result && m.result.partial; if (p && onPartial) onPartial((text + " " + p).trim()); });
  const src = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  node.onaudioprocess = (ev) => { try { rec.acceptWaveform(ev.inputBuffer); } catch (e) { /* ignore */ } };
  src.connect(node); node.connect(ctx.destination);
  return async function stop() {
    node.disconnect(); src.disconnect(); stream.getTracks().forEach((t) => t.stop());
    await new Promise((r) => setTimeout(r, 400));
    try { rec.retrieveFinalResult(); } catch { /* older builds */ }
    await new Promise((r) => setTimeout(r, 300));
    try { rec.remove(); } catch { /* ignore */ }
    await ctx.close();
    onFinal && onFinal(text.trim());
  };
}
