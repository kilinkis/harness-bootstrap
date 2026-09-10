import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// The full command runs state and binding validation after this phase decision.
// Keep their schema, evidence, and approval checks in their existing validators.
async function main(): Promise<void> {
  const phase = process.env.HARNESS_DELIVERY_PHASE ?? "local";
  if (process.argv.length > 2 || (phase !== "local" && phase !== "ci")) {
    throw new Error("Usage: HARNESS_DELIVERY_PHASE=local|ci pnpm run check:delivery");
  }
  const queue: unknown = JSON.parse(await readFile(resolve("feature_list.json"), "utf8"));
  if (!Array.isArray(queue)) throw new Error("DELIVERY_QUEUE_INVALID: feature queue must be an array");
  for (const value of queue as unknown[]) {
    if (typeof value !== "object" || value === null || !("status" in value)) {
      throw new Error("DELIVERY_QUEUE_INVALID: feature entries must contain a status");
    }
    if (phase === "ci" && (value.status === "in_progress" || value.status === "in_review")) {
      throw new Error("DELIVERY_FINALIZATION_REQUIRED: finalize active feature evidence before CI delivery");
    }
    if (value.status === "in_progress") {
      throw new Error("DELIVERY_APPROVAL_REQUIRED: finish implementation and obtain review before the full gate");
    }
  }
  console.log(`delivery phase: ${phase}`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Cannot validate delivery phase");
  process.exitCode = 1;
}
