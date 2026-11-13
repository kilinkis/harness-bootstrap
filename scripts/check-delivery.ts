import { resolve } from "node:path";

import { readFeatureQueue } from "./feature-queue.js";
import type { HarnessFinding } from "./harness-state-support.js";

import { assertDeliverySnapshot } from "./review-binding.js";

// The full command runs state and binding validation after this phase decision.
// Keep their schema, evidence, and approval checks in their existing validators.
async function main(): Promise<void> {
  const phase = process.env.HARNESS_DELIVERY_PHASE ?? "local";
  if (process.argv.length > 2 || (phase !== "local" && phase !== "ci")) {
    throw new Error("Usage: HARNESS_DELIVERY_PHASE=local|ci pnpm run check:delivery");
  }
  const findings: HarnessFinding[] = [];
  const queue = await readFeatureQueue(resolve("."), findings);
  if (!queue || findings.length > 0) throw new Error(`DELIVERY_QUEUE_INVALID: ${findings.map(({ message }) => message).join("; ")}`);
  for (const value of queue) {
    if (phase === "ci" && (value.status === "in_progress" || value.status === "in_review")) {
      throw new Error("DELIVERY_FINALIZATION_REQUIRED: finalize active feature evidence before CI delivery");
    }
    if (value.status === "in_progress") {
      throw new Error("DELIVERY_APPROVAL_REQUIRED: finish implementation and obtain review before the full gate");
    }
  }
  await assertDeliverySnapshot(resolve("."));
  console.log(`delivery phase: ${phase}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Cannot validate delivery phase");
  process.exitCode = 1;
}
