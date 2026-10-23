import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { maxIterations, toolDefinition, type AnyTextAdapter } from "@tanstack/ai";
import { createHarnessHost, defineHarness } from "@tanstack/ai-harness";
import { memoryPersistence } from "@tanstack/ai-persistence";
import { z } from "zod";

import { validateTargetInventory } from "../adoption-audit.js";
import type { AdoptionFinding } from "../adoption-audit-types.js";

type Role = "implementer" | "reviewer";
export type PocAdapters = Record<Role, AnyTextAdapter>;
interface Check { digest: string; findings: AdoptionFinding[] }
const reviewSchema = z.object({
  verdict: z.enum(["approved", "changes_requested"]),
  digest: z.string(),
  reason: z.string().trim().min(1).max(4000),
});
type Review = z.infer<typeof reviewSchema>;
interface RoleState { check?: Check; reviews: Review[] }
export interface PocResult {
  passed: boolean;
  workspace: string;
  initial: Check;
  final: Check;
  review?: Review;
  inventory: string;
  trace: string[];
  reason: string;
}

const manifest = { name: "poc-app", private: true, scripts: {
  check: "tsc --noEmit", test: "node --test",
} };
const task = "Repair harness.targets.json for this non-deployable TypeScript package. " +
  "Declare the root target, its package name, pnpm run check, pnpm run test, and a " +
  "non-applicable build reason. Read context and run check_inventory. " +
  "The commands are declarations only; this exercise checks inventory structure.";

async function snapshot(root: string): Promise<{ content: string; digest: string }> {
  const content = await readFile(join(root, "harness.targets.json"), "utf8");
  return { content, digest: createHash("sha256").update(content).digest("hex") };
}

async function checkInventory(root: string): Promise<Check> {
  return { digest: (await snapshot(root)).digest, findings: await validateTargetInventory(root) };
}

function roleTools(root: string, role: Role, state: RoleState) {
  // Server tools execute through TanStack's loop, with no model-selected paths or shell.
  // https://tanstack.com/ai/latest/docs/tools/server-tools
  const read = toolDefinition({ name: "read_context", description: "Read the fixture, inventory schema, and current digest." })
    .server(async () => ({
      manifest, inventory: await snapshot(root),
      schema: await readFile(new URL("../../harness.targets.schema.json", import.meta.url), "utf8"),
    }));
  const check = toolDefinition({ name: "check_inventory", description: "Run the repository inventory validator; return findings and digest." })
    .server(async () => {
      state.check = await checkInventory(root);
      return state.check;
    });
  const write = toolDefinition({
    name: "write_inventory", description: "Replace only the temporary harness.targets.json.",
    inputSchema: z.object({ content: z.string().max(16000) }),
  }).server(async ({ content }) => {
    await writeFile(join(root, "harness.targets.json"), content);
    return snapshot(root);
  });
  const review = toolDefinition({
    name: "submit_review", description: "Submit exactly one verdict after reading and checking the candidate. Include its digest.",
    inputSchema: reviewSchema,
  }).server((verdict) => {
    state.reviews.push(verdict);
    return { recorded: true };
  });
  return role === "implementer" ? [read, check, write] : [read, check, review];
}

async function runRole(root: string, role: Role, adapter: AnyTextAdapter, trace: string[]): Promise<RoleState> {
  const state: RoleState = { reviews: [] };
  // Separate hosts ensure the reviewer gets no implementer conversation history.
  // https://tanstack.com/ai/latest/docs/harness/overview
  const host = createHarnessHost({ persistence: memoryPersistence() });
  try {
    const session = await host.open(defineHarness({
      name: `inventory-poc/${role}`, adapter,
      systemPrompts: [`You are the ${role} in a bounded inventory repair experiment.`, task,
        role === "reviewer" ? "Independently inspect and check the candidate. Submit one review. You cannot edit." :
          "Fix the inventory, check it, and summarize. Do not claim repository delivery approval."],
      tools: roleTools(root, role, state), agentLoopStrategy: maxIterations(8),
    }), { threadId: role });
    const turn = session.send(task);
    turn.onEvent("TOOL_CALL_START", ({ event }) => { trace.push(`${role}:${event.toolCallName}`); });
    const timer = setTimeout(() => { void turn.cancel("PoC turn exceeded 120 seconds"); }, 120000);
    try {
      await turn;
      if (turn.status() !== "completed") throw new Error(`${role} did not complete`);
    } finally { clearTimeout(timer); }
    return state;
  } finally { await host.close(); }
}

function failureReason(final: Check, implementer: RoleState, reviewer: RoleState): string | undefined {
  if (final.findings.length) return "Final inventory validation failed";
  for (const [role, state] of [["implementer", implementer], ["reviewer", reviewer]] as const) {
    if (!state.check || state.check.findings.length || state.check.digest !== final.digest) {
      return `${role} did not check the final snapshot successfully`;
    }
  }
  if (reviewer.reviews.length !== 1) return "Expected exactly one reviewer verdict";
  const review = reviewer.reviews[0];
  if (review.verdict !== "approved") return "Reviewer requested changes";
  if (review.digest !== final.digest) return "Review digest does not match the final snapshot";
  return undefined;
}

export async function runPoc(adapters: PocAdapters, temporaryRoot = tmpdir()): Promise<PocResult> {
  const root = await mkdtemp(join(temporaryRoot, "tanstack-harness-poc-"));
  const trace: string[] = [];
  try {
    await writeFile(join(root, "package.json"), JSON.stringify(manifest));
    await writeFile(join(root, "tsconfig.json"), "{}");
    await writeFile(join(root, "harness.targets.json"), '{"version":0,"targets":[]}');
    const initial = await checkInventory(root);
    const implementer = await runRole(root, "implementer", adapters.implementer, trace);
    const reviewer = await runRole(root, "reviewer", adapters.reviewer, trace);
    const final = await checkInventory(root);
    const failure = failureReason(final, implementer, reviewer);
    return { passed: failure === undefined, workspace: root, initial, final,
      review: reviewer.reviews[0], inventory: (await snapshot(root)).content, trace,
      reason: failure ?? "Both roles checked the approved snapshot; final inventory validation passed" };
  } finally { await rm(root, { recursive: true, force: true }); }
}
