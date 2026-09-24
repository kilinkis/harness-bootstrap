import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { readFeatureQueue, type Feature } from "./feature-queue.js";
import { validateFeatureEvidence } from "./harness-evidence.js";
import {
  addFinding,
  containsFeatureId,
  readText,
  type HarnessFinding,
} from "./harness-state-support.js";

export type { HarnessFinding } from "./harness-state-support.js";

export async function validateHarnessState(root: string): Promise<HarnessFinding[]> {
  const findings: HarnessFinding[] = [];
  const features = await readFeatureQueue(root, findings);
  if (!features) return findings;
  const active = features.filter(({ status }) => status === "in_progress" || status === "in_review");

  await validateActiveState(root, active, findings);
  await validateFeatureEvidence(root, features, findings);
  return findings;
}

async function validateActiveState(
  root: string,
  active: Feature[],
  findings: HarnessFinding[],
): Promise<void> {
  if (active.length === 0) return;
  const path = "progress/current.md";
  const current = await readText(root, path, "CURRENT_PROGRESS_MISSING", findings);
  if (current === undefined) return;

  for (const feature of active) {
    if (!containsFeatureId(current, feature.id)) {
      addFinding(
        findings,
        "ACTIVE_FEATURE_NOT_CURRENT",
        `${feature.id}: active feature is not recorded in current progress`,
        path,
      );
    }
  }
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
