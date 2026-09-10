import { spawn } from "node:child_process";

import { resolveComparisonBase } from "./comparison-base.js";

async function main(): Promise<void> {
  if (process.argv.length > 2) {
    throw new Error("Usage: HARNESS_BASE_REF=<target> pnpm run analyze:changes");
  }
  const base = await resolveComparisonBase(process.cwd());
  console.log(`Comparison base: ${base.ref} (${base.commit ?? "full analysis"})`);
  // Installed `fallow audit --help` documents --base; full mode must fail on issues.
  const args = base.commit ? ["audit", "--base", base.commit] : ["--fail-on-issues"];
  await new Promise<void>((resolveRun, reject) => {
    const child = spawn("fallow", args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      process.exitCode = code ?? 1;
      resolveRun();
    });
  });
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Change analysis failed");
  process.exitCode = 1;
}
