import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { resolveComparisonBase } from "./comparison-base.js";
import { assertDeliverySnapshot } from "./review-binding.js";

import { findNonRegularEntries, readStagedChanges, type ChangeSize } from "./trivial-change.js";


export function classifySmallChange(changes: ChangeSize[]): string[] {
  const implementation = changes.filter(({ path }) => path !== "feature_list.json" && !path.startsWith("progress/"));
  const reasons: string[] = [];
  if (implementation.length === 0 || implementation.length > 5) reasons.push("Require 1–5 implementation files.");
  if (!implementation.some(({ path }) => /^(src\/.*|tests\/[^/]+)\.ts$/.test(path))) {
    reasons.push("Require a product source or test change.");
  }
  for (const { path, added, deleted } of implementation) {
    if (!/^(src\/(?:[\w-]+\/)*[\w.-]+\.ts|tests\/[\w.-]+\.test\.ts|docs\/task-cli\.md)$/.test(path)) {
      reasons.push(`Path requires the normal lane: ${JSON.stringify(path)}.`);
    }
    if (![added, deleted].every((value) => Number.isSafeInteger(value) && value >= 0)) {
      reasons.push(`Binary or invalid line counts: ${JSON.stringify(path)}.`);
    }
  }
  if (implementation.reduce((total, change) => total + change.added + change.deleted, 0) > 150) {
    reasons.push("Exceeds 150 added plus deleted implementation lines.");
  }
  return reasons;
}

export async function inspectSmallChange(root: string, requestedBase?: string): Promise<string[]> {
  await assertDeliverySnapshot(root);
  const base = await resolveComparisonBase(root, requestedBase);
  if (!base.commit) return ["A first push or missing comparison commit requires the normal lane."];
  const changes = await readStagedChanges(root, base.commit);
  return [...classifySmallChange(changes), ...await findNonRegularEntries(root, changes, "the normal lane")];
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  try {
    if (process.argv.length > 2) throw new Error("Usage: pnpm run check:small-change (set HARNESS_BASE_REF for the actual PR target)");
    const reasons = await inspectSmallChange(resolve("."));
    if (reasons.length > 0) throw new Error(`Small-code lane refused:\n${reasons.join("\n")}`);
    console.log("Small-code scope eligible. Reviewer must confirm low-risk semantics and focused test coverage. Full CI remains required.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Small-code classification failed");
    process.exitCode = 1;
  }
}
