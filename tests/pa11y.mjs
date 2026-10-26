// pa11y WCAG2AA (HTML_CodeSniffer) + axe runners against the local server or BASE_URL.
import pa11y from "pa11y";
import { createMikuServer } from "../server/server.js";
let base = process.env.BASE_URL, server;
if (!base) { server = createMikuServer(); await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}/`; }
let failed = 0;
for (const path of ["", "privacy.html"]) {
  const r = await pa11y(base + path, { standard: "WCAG2AA", runners: ["htmlcs", "axe"], includeWarnings: false, timeout: 60000,
    chromeLaunchConfig: { executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", args: ["--no-sandbox"] } });
  const errs = r.issues.filter((i) => i.type === "error");
  console.log(`${errs.length ? "FAIL" : "PASS"}  pa11y WCAG2AA ${base + path}: ${errs.length} errors`);
  for (const e of errs) console.log(`   - [${e.runner}] ${e.code}: ${e.message} (${e.selector})`);
  failed += errs.length;
}
server?.close();
process.exit(failed ? 1 : 0);
