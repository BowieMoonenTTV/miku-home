// Miku Home runtime config. NO secrets belong in this file.
// Optional add-ons are auto-detected; leave a URL empty to keep that add-on off.
export const config = {
  assistantName: "Miku",
  userName: "Bowie",
  // Your own Home Assistant, e.g. "https://homeassistant.your-tailnet.ts.net". Empty = standalone.
  // The long-lived token is entered on the device in Settings, never written here.
  haUrl: "",
  // Your own Ollama server, e.g. "https://c-machine.your-tailnet.ts.net:11434". Empty = rule-based replies.
  ollamaUrl: "",
  ollamaModel: "llama3.2:3b",
  // Optional VRM avatar served from this origin (not shipped; see docs/avatar.md).
  vrmPath: "avatars/miku.vrm",
};
