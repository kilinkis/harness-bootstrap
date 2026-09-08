import { resolve } from "node:path";

import { validateTargetInventory } from "./adoption-audit.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => arg.startsWith("--"))) {
    throw new Error("Usage: check-target-inventory [repository-root]");
  }
  const findings = await validateTargetInventory(resolve(args[0] ?? "."));
  if (findings.length === 0) {
    console.log("target inventory: valid");
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
  const message = error instanceof Error ? error.message : "Target inventory check failed";
  console.error(message);
  process.exitCode = 1;
}
