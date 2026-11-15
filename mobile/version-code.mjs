// Android versionCode from the app version, e.g. "0.1.0-beta" -> 10030.
// Deterministic: the same version always gives the same code, and every later
// version gives a higher code. The first public APK (v0.1.0-beta) shipped with
// versionCode 100 under the old formula, so every code here is above 100.
//
// code = major * 1,000,000 + minor * 10,000 + patch * 100 + stage
//   stage: alpha.N = 10+N, beta.N = 30+N, rc.N = 50+N (N is 0 to 19), final release = 99
// Android allows codes up to 2,100,000,000, so major can go up to 2099.
const STAGES = { alpha: 10, beta: 30, rc: 50 };

export function versionCode(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)(?:\.(\d+))?)?$/.exec(String(version));
  if (!m) throw new Error(`Unsupported version "${version}": use X.Y.Z or X.Y.Z-alpha|beta|rc[.N]`);
  const [, maj, min, pat, stage, n = "0"] = m;
  const nums = [maj, min, pat, n].map(Number);
  if (nums[1] > 99 || nums[2] > 99) throw new Error(`Minor and patch must be 0 to 99 in "${version}"`);
  if (nums[3] > 19) throw new Error(`Pre-release number must be 0 to 19 in "${version}"`);
  if (nums[0] > 2099) throw new Error(`Major must be 0 to 2099 in "${version}"`);
  const stageCode = stage ? STAGES[stage] + nums[3] : 99;
  return nums[0] * 1_000_000 + nums[1] * 10_000 + nums[2] * 100 + stageCode;
}
