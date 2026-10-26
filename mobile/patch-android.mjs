// Adds the microphone permissions Miku Home needs to the generated Android project.
// Run after `npx cap add android`. Idempotent.
import { readFileSync, writeFileSync } from "node:fs";
const path = "android/app/src/main/AndroidManifest.xml";
let xml = readFileSync(path, "utf8");
const perms = [
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
];
for (const p of perms) {
  if (!xml.includes(`"${p}"`)) {
    xml = xml.replace("</manifest>", `    <uses-permission android:name="${p}" />\n</manifest>`);
  }
}
// Miku Home makes no network requests; drop INTERNET if Capacitor added it.
xml = xml.replace(/\s*<uses-permission android:name="android.permission.INTERNET" \/>/, "");
writeFileSync(path, xml);
console.log("Patched", path, "with", perms.join(", "));

// Version from package.json, e.g. 0.1.0-beta -> versionName 0.1.0-beta, versionCode 100.
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const [maj, min, pat] = pkg.version.split("-")[0].split(".").map(Number);
const code = maj * 10000 + min * 100 + pat;
const gradlePath = "android/app/build.gradle";
let gradle = readFileSync(gradlePath, "utf8");
gradle = gradle.replace(/versionCode \d+/, `versionCode ${code}`).replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
writeFileSync(gradlePath, gradle);
console.log("Set versionName", pkg.version, "versionCode", code);
