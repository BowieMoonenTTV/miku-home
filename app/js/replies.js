// Simple local replies for standalone mode. Pure function, easy to test.
export function localReply(text, { now = new Date(), name = "Bowie", assistant = "Miku" } = {}) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return "I didn't catch anything. You can type instead.";
  if (/\b(say )?(hi|hello|hey)\b/.test(t)) return `Hi ${name}, it's ${assistant}.`;
  if (/\btime\b/.test(t)) return `It's ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`;
  if (/\b(date|day|today)\b/.test(t)) return `Today is ${now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}.`;
  if (/\bhelp\b|what can you do/.test(t)) return "In standalone mode I can say hi, tell the time and date, repeat my last reply, and read back what you type. Home Assistant controls come when the home server is online.";
  if (/\b(light|lights|tv|cast|speaker|google home)\b/.test(t)) return "Home controls need Home Assistant, which isn't connected yet. I've noted your request in the captions.";
  if (/\bthank/.test(t)) return "You're welcome.";
  return `You said: ${text}. I'm in standalone mode, so I can only do simple things for now.`;
}
