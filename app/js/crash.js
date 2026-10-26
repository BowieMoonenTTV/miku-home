// Local-only crash log. Nothing is ever sent anywhere. The user can view, copy or
// export it and attach it to a GitHub issue themselves.
const KEY = "miku.crashLog";
const MAX = 50;
export function readLog() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
export function clearLog() { localStorage.removeItem(KEY); }
export function scrub(s) {
  return String(s || "").replace(/\S+@\S+/g, "[email]").replace(/https?:\/\/\S+/g, "[url]").slice(0, 500);
}
export function record(kind, message, where = "") {
  const log = readLog();
  // Never store audio, transcripts or typed text: only the error message and source location.
  log.push({ at: new Date().toISOString(), kind, message: scrub(message), where: scrub(where) });
  localStorage.setItem(KEY, JSON.stringify(log.slice(-MAX)));
}
export function installLocalCrashLog() {
  window.addEventListener("error", (e) => record("error", e.message, `${(e.filename || "").split("/").pop()}:${e.lineno || 0}`));
  window.addEventListener("unhandledrejection", (e) => record("promise", e.reason && e.reason.message ? e.reason.message : String(e.reason)));
}
export function logAsText() {
  const log = readLog();
  if (!log.length) return "No errors recorded.";
  return log.map((r) => `${r.at} ${r.kind}: ${r.message} ${r.where}`.trim()).join("\n");
}
