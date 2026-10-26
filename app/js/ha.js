// Optional Home Assistant add-on. Used only when config.haUrl is set (the user's own server).
// Uses home-assistant-js-websocket (Apache-2.0), vendored. The token is entered on the device
// by the owner and stored only in that browser; it is never committed or sent anywhere else.
import { createConnection, createLongLivedTokenAuth } from "../vendor/haws/index.js";
let conn = null;
export function haConfigured(config) { return !!(config.haUrl && localStorage.getItem("miku.haToken")); }
export async function haConnect(config) {
  if (conn) return conn;
  const auth = createLongLivedTokenAuth(config.haUrl, localStorage.getItem("miku.haToken"));
  conn = await createConnection({ auth });
  return conn;
}
export async function haConverse(config, text) {
  const c = await haConnect(config);
  const r = await c.sendMessagePromise({ type: "conversation/process", text, language: "en" });
  return r?.response?.speech?.plain?.speech || "Home Assistant had no answer.";
}
