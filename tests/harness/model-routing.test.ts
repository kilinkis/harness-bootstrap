import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const REPOSITORY_ROOT = new URL("../../", import.meta.url);
const COST_TIERS = ["low", "standard", "high"];
const ROLE_FILES: Record<string, string> = {
  coordinator: "agents/leader.md",
  implementer: "agents/implementer.md",
  reviewer: "agents/reviewer.md",
};
const VENDOR_TERMS = /\b(anthropic|claude|opus|sonnet|haiku|openai|gpt|codex|gemini|google|llama|mistral|cursor|copilot)\b/i;

interface ModelRouting {
  version: number;
  costTiers: Record<string, string>;
  taskTiers: Record<string, { costTier: string; use: string }>;
  roles: Record<string, string>;
  riskyReview: { paths: string[]; conditions: string[] };
}

async function readText(path: string): Promise<string> {
  return readFile(new URL(path, REPOSITORY_ROOT), "utf8");
}

async function readRouting(): Promise<{ text: string; routing: ModelRouting }> {
  const text = await readText("harness.models.json");
  return { text, routing: JSON.parse(text) as ModelRouting };
}

function isNonEmptyStringList(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 &&
    value.every((item) => typeof item === "string" && Boolean(item.trim()));
}

void test("model routing config defines cost tiers, task tiers, and triggers", async () => {
  const { routing } = await readRouting();
  assert.equal(routing.version, 1);
  assert.deepEqual(Object.keys(routing.costTiers).sort(), [...COST_TIERS].sort());
  for (const [name, tier] of Object.entries(routing.taskTiers)) {
    assert.ok(COST_TIERS.includes(tier.costTier), `${name} must use a known cost tier`);
    assert.ok(tier.use.trim(), `${name} must describe its use`);
  }
  for (const name of ["explore-report", "implement", "review", "risky-review"]) {
    assert.ok(Object.hasOwn(routing.taskTiers, name), `task tier ${name} is required`);
  }
  assert.ok(isNonEmptyStringList(routing.riskyReview.paths), "risky-review paths are required");
  assert.ok(isNonEmptyStringList(routing.riskyReview.conditions), "risky-review conditions are required");
});

void test("each role file states the task tier from the config", async () => {
  const { routing } = await readRouting();
  assert.deepEqual(Object.keys(routing.roles).sort(), Object.keys(ROLE_FILES).sort());
  for (const [role, path] of Object.entries(ROLE_FILES)) {
    const tier = routing.roles[role];
    assert.ok(Object.hasOwn(routing.taskTiers, tier), `${role} must use a defined task tier`);
    const stated = /^Model tier: `([^`]+)`/m.exec(await readText(path))?.[1];
    assert.equal(stated, tier, `${path} must state model tier ${tier}`);
  }
});

void test("core routing policy names no vendor, tool, or model", async () => {
  const { text } = await readRouting();
  assert.doesNotMatch(text, VENDOR_TERMS);
  assert.doesNotMatch(await readText("docs/model-routing.md"), VENDOR_TERMS);
});
