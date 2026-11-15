// Adds the microphone permissions Miku Home needs to the generated Android project.
// Run after `npx cap add android`. Idempotent.
import { readFileSync, writeFileSync } from "node:fs";
import { versionCode } from "./version-code.mjs";
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

// Version from package.json, e.g. 0.1.0-beta -> versionName 0.1.0-beta, versionCode 10030.
// See version-code.mjs and README.md "Version numbers".
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const code = versionCode(pkg.version);
const gradlePath = "android/app/build.gradle";
let gradle = readFileSync(gradlePath, "utf8");
if (!/versionCode \d+/.test(gradle) || !/versionName "[^"]*"/.test(gradle)) throw new Error(`versionCode or versionName not found in ${gradlePath}`);
gradle = gradle.replace(/versionCode \d+/, `versionCode ${code}`).replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`);
writeFileSync(gradlePath, gradle);
console.log("Set versionName", pkg.version, "versionCode", code);
