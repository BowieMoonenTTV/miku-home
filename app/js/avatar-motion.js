// Avatar body language, independent of how the avatar is drawn (unit-tested in Node).
// States: idle, listening, thinking, speaking. Gestures: blink, nod, wave, tilt, glance,
// plus gentle breathing/sway while idle. Every gesture is a few small transforms.
// With prefers-reduced-motion the avatar holds calm, static poses instead: no sway, no
// blinking, no waving, nothing that moves quickly or flashes. It changes only when the
// state changes.

export const STATES = ["idle", "listening", "thinking", "speaking"];
export const GESTURES = { blink: 0.18, nod: 0.9, wave: 1.6, tilt: 1.2, glance: 1.1 };
// Which gesture each app event plays.
export const EVENT_GESTURE = { greeting: "wave", listening: "tilt", thinking: "glance", doneSpeaking: "nod" };

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const bump = (p) => Math.sin(Math.PI * Math.min(1, Math.max(0, p))); // 0 → 1 → 0

export function neutralPose() {
  return { headPitch: 0, headYaw: 0, headRoll: 0, bodyY: 0, bodyRoll: 0, eyeOpen: 1, eyeX: 0, armRaise: 0, armWave: 0, mouth: 0 };
}

export function createMotion({ reducedMotion = false, random = Math.random } = {}) {
  let state = "idle";
  let t = 0;
  let gesture = null; // { name, t }
  let nextBlink = 2 + random() * 3;
  let nextIdle = 8 + random() * 6;
  let speechLevel = 0; // 0..1 mouth from lip-sync visemes, decays
  let rate = 1;
  let changed = true; // reduced-motion: render only when something changed

  function trigger(name) {
    if (!(name in GESTURES)) return false;
    if (reducedMotion && name === "blink") return false;
    gesture = { name, t: 0 }; changed = true;
    return true;
  }
  function setState(s) {
    if (!STATES.includes(s) || s === state) return;
    const prev = state; state = s; changed = true;
    if (s === "listening") trigger(EVENT_GESTURE.listening);
    else if (s === "thinking") trigger(EVENT_GESTURE.thinking);
    else if (s === "idle" && prev === "speaking") trigger(EVENT_GESTURE.doneSpeaking);
  }
  function update(dt) {
    dt = Math.min(Math.max(dt || 0, 0), 0.5); // the reduced-motion ticker runs every 250 ms
    t += dt;
    const p = neutralPose();
    if (!reducedMotion) {
      // Breathing and a slow sway; quieter while listening so Miku looks attentive.
      const calm = state === "listening" ? 0.4 : 1;
      p.bodyY = Math.sin(t * Math.PI * 2 / 4) * 0.006 * calm;
      p.bodyRoll = Math.sin(t * Math.PI * 2 / 7) * 0.02 * calm;
      p.headYaw = Math.sin(t * Math.PI * 2 / 9) * 0.03 * calm;
      if (t >= nextBlink && !(gesture && gesture.name === "blink")) { trigger("blink"); nextBlink = t + 2.5 + random() * 3.5; }
      if (state === "idle" && t >= nextIdle && !gesture) { trigger(random() < 0.5 ? "tilt" : "glance"); nextIdle = t + 9 + random() * 6; }
    }
    // State poses (static, so reduced motion keeps them too).
    if (state === "listening") { p.headRoll += 0.12; p.headPitch -= 0.04; }
    if (state === "thinking") { p.eyeX = 0.6; p.headYaw += 0.12; p.headPitch -= 0.06; }
    if (state === "speaking") {
      if (reducedMotion) p.mouth = 0.35;
      else p.mouth = Math.max(speechLevel, 0.15 + 0.35 * Math.abs(Math.sin(t * 9 * rate)));
    }
    speechLevel = Math.max(0, speechLevel - dt * 6);

    if (gesture) {
      const d = GESTURES[gesture.name];
      gesture.t += dt;
      const g = gesture.t / d;
      if (reducedMotion) {
        // Held, static version of each gesture, no oscillation.
        if (gesture.name === "wave") p.armRaise = 1;
        if (gesture.name === "nod") p.headPitch += 0.08;
        if (gesture.name === "tilt") p.headRoll += 0.1;
        if (gesture.name === "glance") p.eyeX = 0.6;
      } else {
        if (gesture.name === "blink") p.eyeOpen = 1 - bump(g);
        if (gesture.name === "nod") p.headPitch += 0.14 * Math.sin(g * Math.PI * 2) * (1 - g);
        if (gesture.name === "tilt") p.headRoll += 0.16 * bump(g);
        if (gesture.name === "glance") { p.eyeX = Math.max(p.eyeX, 0.7 * bump(g)); p.headYaw += 0.1 * bump(g); }
        if (gesture.name === "wave") { p.armRaise = ease(Math.min(1, g * 4)) * ease(Math.min(1, (1 - g) * 4)); p.armWave = Math.sin(g * Math.PI * 6) * p.armRaise; }
      }
      if (gesture.t >= d) { gesture = null; changed = true; }
    }
    const dirty = changed; changed = false;
    return { pose: p, dirty };
  }
  return {
    get state() { return state; },
    get gesture() { return gesture ? gesture.name : null; },
    setState, trigger, update,
    viseme(open) { speechLevel = Math.max(speechLevel, open); changed = true; },
    setRate(r) { rate = Number(r) || 1; },
    reducedMotion,
  };
}
