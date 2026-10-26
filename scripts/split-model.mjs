// Splits a Vosk model archive into parts under 5 MB so static hosts with per-file limits can serve it.
// Usage: node scripts/split-model.mjs path/to/vosk-model-small-en-us-0.15.tar.gz
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
const src = process.argv[2]; if (!src) { console.error("usage: split-model.mjs <model.tar.gz>"); process.exit(1); }
const buf = readFileSync(src), size = 5 * 1024 * 1024, name = basename(src), out = new URL("../app/models/", import.meta.url);
mkdirSync(out, { recursive: true });
const parts = [];
for (let i = 0, n = 0; i < buf.length; i += size, n++) { const p = `${name}.part${String(n).padStart(2, "0")}`; writeFileSync(new URL(p, out), buf.subarray(i, i + size)); parts.push(p); }
writeFileSync(new URL("model.json", out), JSON.stringify({ name, size: buf.length, parts }, null, 2) + "\n");
console.log(`wrote ${parts.length} parts, ${buf.length} bytes`);
