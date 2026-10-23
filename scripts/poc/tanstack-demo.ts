import { createHash } from "node:crypto";
import { fakeText } from "@tanstack/ai/testing";
import type { PocAdapters } from "./tanstack.js";

export const demoInventory = JSON.stringify({ version: 1, targets: [{
  path: ".", packageName: "poc-app", deployable: false,
  typecheck: { command: "pnpm run check" }, test: { command: "pnpm run test" },
  build: { notApplicable: "This package is not deployed." },
}] });

export function demoAdapters(): PocAdapters {
  // The scripted model replaces network inference, not the harness or tools.
  // https://tanstack.com/ai/latest/docs/advanced/testing
  const implementer = fakeText();
  implementer.setResponses([
    { toolCalls: [{ name: "read_context" }] },
    { toolCalls: [{ name: "write_inventory", input: { content: demoInventory } }] },
    { toolCalls: [{ name: "check_inventory" }] },
    { text: "Inventory repaired and checked." },
  ]);
  const reviewer = fakeText();
  reviewer.setResponses([
    { toolCalls: [{ name: "read_context" }] },
    { toolCalls: [{ name: "check_inventory" }] },
    { toolCalls: [{ name: "submit_review", input: {
      verdict: "approved", digest: createHash("sha256").update(demoInventory).digest("hex"),
      reason: "The root target is declared and independent inventory validation passed.",
    } }] },
    { text: "Review complete." },
  ]);
  return { implementer, reviewer };
}
