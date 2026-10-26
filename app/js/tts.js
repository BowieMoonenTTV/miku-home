// Text to speech using ONLY on-device voices (SpeechSynthesisVoice.localService === true).
// Network voices (for example "Google US English" in Chrome) are never used.
export function localVoices() {
  if (!("speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.localService);
}
export function whenVoicesReady() {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve([]);
    const v = localVoices();
    if (v.length) return resolve(v);
    speechSynthesis.addEventListener("voiceschanged", () => resolve(localVoices()), { once: true });
    setTimeout(() => resolve(localVoices()), 1500);
  });
}
export function speak(text, { voiceURI, rate = 1, onBoundary, onEnd } = {}) {
  const voices = localVoices();
  if (!voices.length) { onEnd && onEnd(); return false; }
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voices.find((v) => v.voiceURI === voiceURI) || voices.find((v) => /^en/i.test(v.lang)) || voices[0];
  u.rate = rate;
  if (onBoundary) u.onboundary = onBoundary;
  u.onend = () => onEnd && onEnd();
  u.onerror = () => onEnd && onEnd();
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
  return true;
}
export function stopSpeaking() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }
