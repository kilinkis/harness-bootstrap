import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { readFeatureQueue } from "./feature-queue.js";
import { validateFeatureEvidence } from "./harness-evidence.js";
import type { HarnessFinding } from "./harness-state-support.js";

export type { HarnessFinding } from "./harness-state-support.js";

export async function validateHarnessState(root: string): Promise<HarnessFinding[]> {
  const findings: HarnessFinding[] = [];
  const features = await readFeatureQueue(root, findings);
  if (!features) return findings;
  await validateFeatureEvidence(root, features, findings);
  return findings;
}

async function main(): Promise<void> {
  const root = resolve(process.argv[2] ?? ".");
  const findings = await validateHarnessState(root);
  if (findings.length === 0) {
    console.log("harness state: valid");
    return;
  }
  for (const finding of findings) {
    console.error(`${finding.code}: ${finding.message}`);
  }
  process.exitCode = 1;
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  await main();
}
