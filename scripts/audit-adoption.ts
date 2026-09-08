import { resolve } from "node:path";

import { auditAdoption } from "./adoption-audit.js";
import type { AdoptionAuditResult } from "./adoption-audit-types.js";

interface CliOptions {
  json: boolean;
  root: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const result = await auditAdoption(options.root);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printHumanReport(result);
  if (result.findings.length > 0) process.exitCode = 1;
}

function parseOptions(args: string[]): CliOptions {
  const json = args.includes("--json");
  const paths = args.filter((arg) => arg !== "--json");
  if (paths.length > 1 || paths.some((path) => path.startsWith("--"))) {
    throw new Error("Usage: audit-adoption [--json] [repository-root]");
  }
  return { json, root: resolve(paths[0] ?? ".") };
}

function printHumanReport(result: AdoptionAuditResult): void {
  console.log(
    `Adoption audit: ${result.targets.length} target(s), ${result.findings.length} finding(s)`,
  );
  console.log("\nTargets:");
  for (const target of result.targets) {
    const indicators = target.frontendIndicators.length > 0
      ? target.frontendIndicators.join(", ")
      : "none";
    console.log(`- ${target.path}: frontend indicators ${indicators}`);
  }
  console.log("\nFindings:");
  if (result.findings.length === 0) console.log("- none");
  for (const finding of result.findings) {
    console.log(`- ${finding.code}: ${finding.message}`);
  }
  console.log("\nProposed harness.targets.json:");
  console.log(JSON.stringify(result.proposedInventory, null, 2));
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Adoption audit failed";
  console.error(message);
  process.exitCode = 1;
}
