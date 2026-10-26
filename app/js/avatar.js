// Decorative avatar. The container is aria-hidden; captions carry all information.
// three.js (MIT) draws it; @pixiv/three-vrm (MIT) loads an optional VRM; TalkingHead's
// LipsyncEn (MIT, Mika Suominen) turns words into visemes for the mouth.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { LipsyncEn } from "../vendor/talkinghead/lipsync-en.mjs";
import { createMotion } from "./avatar-motion.js";

const lipsync = new LipsyncEn();
const VISEME_TO_VRM = { aa: "aa", E: "ee", I: "ih", O: "oh", U: "ou", PP: null, FF: "ih", TH: "ih", DD: "ih", kk: "aa", CH: "ih", SS: "ih", nn: "ih", RR: "oh", sil: null };
const VISEME_OPEN = { aa: 1, E: 0.7, I: 0.5, O: 0.8, U: 0.6, PP: 0, FF: 0.3, TH: 0.3, DD: 0.4, kk: 0.5, CH: 0.4, SS: 0.3, nn: 0.3, RR: 0.5, sil: 0 };

export function wordVisemes(word) {
  const w = lipsync.preProcessText(word);
  return lipsync.wordsToVisemes(w).visemes;
}

export async function createAvatar(stage, { vrmPath, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ antialias: !reducedMotion, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // cheap on phones
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 20);
  camera.position.set(0, 1.2, 1.9);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.2));
  let vrm = null;
  const rig = { root: null, head: null, eyes: [], eyeBase: [], mouth: null, arm: null };

  try {
    const head = await fetch(vrmPath, { method: "HEAD" });
    if (head.ok) {
      const loader = new GLTFLoader();
      loader.register((p) => new VRMLoaderPlugin(p));
      const gltf = await loader.loadAsync(vrmPath);
      vrm = gltf.userData.vrm; VRMUtils.rotateVRM0(vrm); scene.add(vrm.scene);
      const bone = (n) => vrm.humanoid && vrm.humanoid.getNormalizedBoneNode(n);
      rig.root = vrm.scene; rig.head = bone("head"); rig.arm = bone("rightUpperArm");
    }
  } catch { /* fall back to placeholder */ }

  if (!vrm) {
    // Simple placeholder: teal hair with twin tails, eyes that blink, a mouth that opens,
    // and a hand that can wave. Everything is a plain transform on a few meshes.
    const teal = new THREE.MeshStandardMaterial({ color: 0x39d0d8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xffe0cc });
    const dark = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const root = new THREE.Group(); root.position.set(0, 1.25, 0);
    const g = new THREE.Group(); root.add(g);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 18), skin));
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2), teal); hair.position.y = 0.03; g.add(hair);
    for (const x of [-0.38, 0.38]) { const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 6, 12), teal); t.position.set(x, -0.2, -0.05); g.add(t); }
    for (const x of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), dark); e.position.set(x, 0.02, 0.26); g.add(e); rig.eyes.push(e); rig.eyeBase.push(x); }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), dark); mouth.position.set(0, -0.12, 0.25); mouth.scale.set(1.2, 0.15, 0.5); g.add(mouth);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.2, 6, 12), teal); body.position.set(0, -0.5, -0.05); root.add(body);
    // Arm pivots at the right shoulder; the hand sits at the end.
    const arm = new THREE.Group(); arm.position.set(0.22, -0.4, 0.14); root.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), skin); hand.position.set(0.05, -0.18, 0.05); arm.add(hand);
    arm.rotation.z = 0;
    scene.add(root);
    Object.assign(rig, { root, head: g, mouth, arm });
  }

  function resize() { const w = stage.clientWidth || 320, h = stage.clientHeight || 240; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage); else addEventListener("resize", resize);

  const motion = createMotion({ reducedMotion });
  let queue = []; let shape = null; let frames = 0; let running = true;
  const clock = new THREE.Clock();

  function apply(p) {
    if (rig.root) { rig.root.position.y = (vrm ? 0 : 1.25) + p.bodyY; rig.root.rotation.z = p.bodyRoll; }
    if (rig.head) { rig.head.rotation.set(p.headPitch, p.headYaw, p.headRoll); }
    if (rig.arm) {
      if (vrm) { rig.arm.rotation.z = -1.0 * p.armRaise + p.armWave * 0.3; } // VRM path: not tested with a real model yet
      else { rig.arm.rotation.z = Math.PI * 0.85 * p.armRaise + p.armWave * 0.35; }
    }
    rig.eyes.forEach((e, i) => { e.scale.y = Math.max(0.1, p.eyeOpen); e.position.x = rig.eyeBase[i] + p.eyeX * 0.03; });
    if (vrm && vrm.expressionManager) {
      const em = vrm.expressionManager;
      em.setValue("blink", 1 - p.eyeOpen);
      for (const k of ["aa", "ee", "ih", "oh", "ou"]) em.setValue(k, k === (shape || "aa") ? p.mouth : 0);
    } else if (rig.mouth) rig.mouth.scale.y = 0.15 + p.mouth * 0.9;
  }

  function step(dt) {
    if (queue.length) { const v = queue[0]; v.t -= dt; motion.viseme(VISEME_OPEN[v.v] ?? 0.3); shape = VISEME_TO_VRM[v.v] ?? shape; if (v.t <= 0) queue.shift(); }
    const { pose, dirty } = motion.update(dt);
    if (!reducedMotion || dirty) {
      apply(pose);
      if (vrm) vrm.update(dt);
      renderer.render(scene, camera);
      frames++;
      if (frames % 15 === 1 || reducedMotion) stage.dataset.frames = String(frames);
    }
    stage.dataset.state = motion.state;
    stage.dataset.gesture = motion.gesture || "";
  }

  const visible = () => !document.hidden && !stage.hidden;
  let last = 0;
  if (reducedMotion) {
    // No animation loop: a slow check that redraws only when the state or pose changed.
    const iv = setInterval(() => { if (!running) return clearInterval(iv); if (visible()) step(clock.getDelta()); else clock.getDelta(); }, 250);
  } else {
    const loop = (now) => {
      if (!running) return;
      requestAnimationFrame(loop);
      if (!visible()) { clock.getDelta(); return; }
      if (now - last < 32) return; // about 30 frames a second is plenty, and cheaper on phones
      last = now; step(clock.getDelta());
    };
    requestAnimationFrame(loop);
  }
  step(0);

  return {
    setState(s) { motion.setState(s); if (s !== "speaking") queue = []; },
    gesture(name) { return motion.trigger(name); },
    setRate(r) { motion.setRate(r); },
    sayWord(word) { if (reducedMotion) return; for (const v of wordVisemes(word)) queue.push({ v, t: 0.07 }); },
    stop() { queue = []; motion.setState("idle"); },
    destroy() { running = false; renderer.dispose(); renderer.domElement.remove(); },
    get state() { return motion.state; },
    kind: vrm ? "vrm" : "placeholder",
  };
}
