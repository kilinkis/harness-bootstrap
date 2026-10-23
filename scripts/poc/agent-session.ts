import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

import { validateTargetInventory } from "../adoption-audit.js";

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const inventorySchema = z.string().max(16000);
const checkSchema = z.object({ digest: digestSchema, passed: z.boolean() }).strict();
const reviewSchema = z.object({
  verdict: z.enum(["approved", "changes_requested"]),
  digest: digestSchema, reason: z.string().trim().min(1).max(4000),
}).strict();
const stateSchema = z.object({
  version: z.literal(1), phase: z.enum(["implementing", "reviewing", "completed"]),
  inventory: inventorySchema,
  implementerCheck: checkSchema.optional(), reviewerCheck: checkSchema.optional(),
  review: reviewSchema.optional(),
}).strict();
type State = z.infer<typeof stateSchema>;
const commands = ["read", "write", "check", "handoff", "review", "finish", "clean"];
export const agentUsage = "Usage: pnpm poc:agent start | <read|write|check|handoff|review|finish|clean> <session-id>\n" +
  "write reads inventory JSON from stdin; review reads {verdict,digest,reason} JSON from stdin.\n" +
  "The invoking agent supplies reasoning and delegates an independent reviewer. No API key is used.";
const manifest = { name: "poc-app", private: true, scripts: {
  check: "tsc --noEmit", test: "node --test",
} };

function digest(state: State): string {
  return createHash("sha256").update(state.inventory).digest("hex");
}

function requirePhase(state: State, phase: State["phase"]): void {
  if (state.phase !== phase) throw new Error(`Requires ${phase} phase; current phase is ${state.phase}`);
}

function requireCheck(state: State, role: "implementer" | "reviewer"): void {
  const check = state[`${role}Check`];
  if (!check?.passed || check.digest !== digest(state)) {
    throw new Error(`A successful ${role} check of the current digest is required`);
  }
}

async function validate(state: State) {
  const root = await mkdtemp(join(tmpdir(), "agent-poc-check-"));
  try {
    await Promise.all([
      writeFile(join(root, "package.json"), JSON.stringify(manifest)),
      writeFile(join(root, "tsconfig.json"), "{}"),
      writeFile(join(root, "harness.targets.json"), state.inventory),
    ]);
    const findings = await validateTargetInventory(root);
    return { digest: digest(state), passed: findings.length === 0, findings };
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function context(id: string, state: State): Promise<Record<string, unknown>> {
  return { sessionId: id, ...state, digest: digest(state), manifest,
    task: "Repair this non-deployable TypeScript package's target inventory. Declare the root " +
      "target, its package name, pnpm run check, pnpm run test, and a non-applicable build reason. " +
      "Commands are declarations only. After implementer check and handoff, delegate a fresh " +
      "reviewer to read, check, and review this session. The implementer then runs finish.",
    schema: await readFile(new URL("../../harness.targets.schema.json", import.meta.url), "utf8"),
  };
}

async function save(path: string, state: State): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(stateSchema.parse(state), null, 2), { flag: "wx", mode: 0o600 });
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}

function writeInventory(state: State, input: string): void {
  requirePhase(state, "implementing");
  state.inventory = inventorySchema.parse(input);
  delete state.implementerCheck;
  delete state.reviewerCheck;
  delete state.review;
}

function submitReview(state: State, input: string): void {
  requirePhase(state, "reviewing");
  if (state.review) throw new Error("A review has already been submitted");
  const review = reviewSchema.parse(JSON.parse(input) as unknown);
  if (review.digest !== digest(state)) throw new Error("Review digest does not match the current inventory");
  if (state.reviewerCheck?.digest !== review.digest) {
    throw new Error("Reviewer must check the current inventory before submitting a verdict");
  }
  if (review.verdict === "approved") requireCheck(state, "reviewer");
  state.review = review;
  if (review.verdict === "changes_requested") {
    state.phase = "implementing";
    delete state.implementerCheck;
    delete state.reviewerCheck;
  }
}

async function transition(command: string, state: State, input: string): Promise<Record<string, unknown>> {
  switch (command) {
    case "write": writeInventory(state, input); break;
    case "check": {
      if (state.phase === "completed") throw new Error("Session is complete; use read or clean");
      const role = state.phase === "implementing" ? "implementer" : "reviewer";
      const check = await validate(state);
      state[`${role}Check`] = { digest: check.digest, passed: check.passed };
      return { role, check };
    }
    case "handoff":
      requirePhase(state, "implementing");
      requireCheck(state, "implementer");
      state.phase = "reviewing";
      delete state.review;
      delete state.reviewerCheck;
      break;
    case "review": submitReview(state, input); break;
    case "finish": {
      requirePhase(state, "reviewing");
      requireCheck(state, "implementer");
      requireCheck(state, "reviewer");
      if (state.review?.verdict !== "approved" || state.review.digest !== digest(state)) {
        throw new Error("A matching independent approval is required");
      }
      const final = await validate(state);
      if (!final.passed) throw new Error("Final inventory validation failed");
      state.phase = "completed";
      return { passed: true, final };
    }
  }
  return {};
}

export async function agentCommand(root: string, args: string[], input = ""): Promise<Record<string, unknown>> {
  const [command, id] = args;
  if (command === "start" && args.length === 1) {
    await mkdir(root, { recursive: true, mode: 0o700 });
    const sessionId = randomUUID();
    const state: State = { version: 1, phase: "implementing", inventory: '{"version":0,"targets":[]}' };
    await writeFile(join(root, `${sessionId}.json`), JSON.stringify(state), { flag: "wx", mode: 0o600 });
    return context(sessionId, state);
  }
  if (args.length !== 2 || !commands.includes(command) || !z.string().uuid().safeParse(id).success) {
    throw new Error(agentUsage);
  }
  const path = join(root, `${id}.json`);
  const lockPath = join(root, `${id}.lock`);
  const lock = await open(lockPath, "wx", 0o600).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new Error("Session is busy. Retry after the other command finishes.");
    }
    throw error;
  });
  try {
    if (command === "clean") {
      await rm(path);
      return { sessionId: id, cleaned: true };
    }
    const state = stateSchema.parse(JSON.parse(await readFile(path, "utf8")) as unknown);
    if (command === "read") return await context(id, state);
    const result = await transition(command, state, input);
    await save(path, state);
    return { sessionId: id, ...state, digest: digest(state), ...result };
  } finally {
    await lock.close();
    await rm(lockPath, { force: true });
  }
}
