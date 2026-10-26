// Adds the microphone permissions Miku Home needs to the generated Android project,
// removes INTERNET, and turns off Android backup.
// Run after `npx cap add android`. Idempotent.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

// Keep app data (including any Home Assistant token in WebView storage) out of
// Google cloud backup and device-to-device transfer.
// allowBackup=false covers Android 11 and lower; fullBackupContent=false turns off
// Auto Backup there too; dataExtractionRules excludes everything on Android 12+.
xml = xml.replace(/android:allowBackup="[^"]*"/, 'android:allowBackup="false"');
if (!xml.includes("android:allowBackup=")) {
  xml = xml.replace("<application", '<application\n        android:allowBackup="false"');
}
if (!xml.includes("android:fullBackupContent=")) {
  xml = xml.replace('android:allowBackup="false"', 'android:allowBackup="false"\n        android:fullBackupContent="false"');
}
if (!xml.includes("android:dataExtractionRules=")) {
  xml = xml.replace('android:fullBackupContent="false"', 'android:fullBackupContent="false"\n        android:dataExtractionRules="@xml/data_extraction_rules"');
}
const rulesDir = "android/app/src/main/res/xml";
mkdirSync(rulesDir, { recursive: true });
const domains = ["root", "file", "database", "sharedpref", "external"];
const excl = domains.map((d) => `        <exclude domain="${d}" path="." />`).join("\n");
writeFileSync(
  `${rulesDir}/data_extraction_rules.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<!-- Miku Home: nothing is backed up to the cloud or copied to a new device. -->\n<data-extraction-rules>\n    <cloud-backup>\n${excl}\n    </cloud-backup>\n    <device-transfer>\n${excl}\n    </device-transfer>\n</data-extraction-rules>\n`,
);
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
