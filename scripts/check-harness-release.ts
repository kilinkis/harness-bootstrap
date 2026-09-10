import { resolve } from "node:path";

import { validateHarnessRelease } from "./harness-release.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => arg.startsWith("--"))) {
    throw new Error("Usage: check-harness-release [repository-root]");
  }
  const findings = await validateHarnessRelease(resolve(args[0] ?? "."));
  if (findings.length === 0) {
    console.log("harness release: valid");
    return;
  }
  for (const finding of findings) {
    console.error(`${finding.code}: ${finding.message}`);
  }
  process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Harness release check failed");
  process.exitCode = 1;
}
