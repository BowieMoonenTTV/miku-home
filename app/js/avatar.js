// Decorative avatar. The container is aria-hidden; captions carry all information.
// three.js (MIT) draws it; @pixiv/three-vrm (MIT) loads an optional VRM; TalkingHead's
// LipsyncEn (MIT, Mika Suominen) turns words into visemes for the mouth.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { LipsyncEn } from "../vendor/talkinghead/lipsync-en.mjs";

const lipsync = new LipsyncEn();
const VISEME_TO_VRM = { aa: "aa", E: "ee", I: "ih", O: "oh", U: "ou", PP: null, FF: "ih", TH: "ih", DD: "ih", kk: "aa", CH: "ih", SS: "ih", nn: "ih", RR: "oh", sil: null };
const VISEME_OPEN = { aa: 1, E: 0.7, I: 0.5, O: 0.8, U: 0.6, PP: 0, FF: 0.3, TH: 0.3, DD: 0.4, kk: 0.5, CH: 0.4, SS: 0.3, nn: 0.3, RR: 0.5, sil: 0 };

export function wordVisemes(word) {
  const w = lipsync.preProcessText(word);
  return lipsync.wordsToVisemes(w).visemes;
}

export async function createAvatar(stage, { vrmPath, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  stage.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 4 / 3, 0.1, 20);
  camera.position.set(0, 1.35, 1.6);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.2));
  let vrm = null, mouth = null;

  try {
    const head = await fetch(vrmPath, { method: "HEAD" });
    if (head.ok) {
      const loader = new GLTFLoader();
      loader.register((p) => new VRMLoaderPlugin(p));
      const gltf = await loader.loadAsync(vrmPath);
      vrm = gltf.userData.vrm; VRMUtils.rotateVRM0(vrm); scene.add(vrm.scene);
    }
  } catch { /* fall back to placeholder */ }

  if (!vrm) {
    // Simple placeholder face: teal head, two twin-tail shapes, a mouth that opens.
    const teal = new THREE.MeshStandardMaterial({ color: 0x39d0d8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xffe0cc });
    const dark = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const g = new THREE.Group(); g.position.set(0, 1.35, 0);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 24), skin));
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), teal); hair.position.y = 0.03; g.add(hair);
    for (const x of [-0.38, 0.38]) { const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.5, 8, 16), teal); t.position.set(x, -0.2, -0.05); g.add(t); }
    for (const x of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), dark); e.position.set(x, 0.02, 0.26); g.add(e); }
    mouth = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), dark); mouth.position.set(0, -0.12, 0.25); mouth.scale.set(1.2, 0.15, 0.5); g.add(mouth);
    scene.add(g);
  }

  function resize() { const w = stage.clientWidth || 320, h = stage.clientHeight || 240; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  resize(); addEventListener("resize", resize);

  let queue = []; let current = { open: 0, shape: null };
  const clock = new THREE.Clock();
  function setMouth(open, shape) {
    if (vrm && vrm.expressionManager) {
      for (const k of ["aa", "ee", "ih", "oh", "ou"]) vrm.expressionManager.setValue(k, k === shape ? open : 0);
    } else if (mouth) { mouth.scale.y = 0.15 + open * 0.9; }
  }
  function frame() {
    const dt = clock.getDelta();
    if (queue.length) { const v = queue[0]; v.t -= dt; current = { open: VISEME_OPEN[v.v] ?? 0.3, shape: VISEME_TO_VRM[v.v] ?? null }; if (v.t <= 0) queue.shift(); }
    else current = { open: Math.max(0, current.open - dt * 6), shape: current.shape };
    setMouth(current.open, current.shape);
    if (vrm) vrm.update(dt);
    renderer.render(scene, camera);
    if (!reducedMotion) requestAnimationFrame(frame);
  }
  frame();
  return {
    sayWord(word) { if (reducedMotion) return; for (const v of wordVisemes(word)) queue.push({ v, t: 0.07 }); },
    stop() { queue = []; },
    kind: vrm ? "vrm" : "placeholder",
  };
}
