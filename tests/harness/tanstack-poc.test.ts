import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fakeText, type FakeResponseStep } from "@tanstack/ai/testing";

import { demoAdapters, demoInventory } from "../../scripts/poc/tanstack-demo.js";
import { runPoc } from "../../scripts/poc/tanstack.js";

function reviewer(steps: FakeResponseStep[]) {
  const adapter = fakeText();
  adapter.setResponses([...steps, { text: "Review finished." }]);
  return adapter;
}
const check = { toolCalls: [{ name: "check_inventory" }] };
const approval = { toolCalls: [{ name: "submit_review", input: {
  verdict: "approved", digest: createHash("sha256").update(demoInventory).digest("hex"),
  reason: "Independent fixture check passed.",
} }] };

void test("real TanStack sessions repair, review, validate, and clean up the fixture", async () => {
  const parent = await mkdtemp(join(tmpdir(), "poc-contract-"));
  try {
    const result = await runPoc(demoAdapters(), parent);
    assert.equal(result.passed, true);
    assert.ok(result.initial.findings.length > 0);
    assert.deepEqual(result.final.findings, []);
    assert.equal(result.review?.digest, result.final.digest);
    assert.deepEqual(result.trace, ["implementer:read_context", "implementer:write_inventory",
      "implementer:check_inventory", "reviewer:read_context", "reviewer:check_inventory", "reviewer:submit_review"]);
    assert.deepEqual(await readdir(parent), []);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

void test("review has fresh context and cannot access the implementer's write tool", async () => {
  const adapters = demoAdapters();
  adapters.reviewer = reviewer([
    ({ request }) => {
      const names = request.tools?.map((tool) => String(tool.name));
      assert.deepEqual(names, ["read_context", "check_inventory", "submit_review"]);
      assert.equal(request.messages.filter((message) => message.role === "user").length, 1);
      assert.equal(request.messages.some((message) => message.role === "assistant"), false);
      return { toolCalls: [{ name: "write_inventory", input: { content: "{}" } }] };
    }, check, approval,
  ]);
  const result = await runPoc(adapters);
  assert.equal(result.inventory, demoInventory);
});

void test("claimed success cannot bypass failed final validation", async () => {
  const adapters = demoAdapters();
  const implementer = fakeText();
  implementer.setResponses([{ text: "Done!" }]);
  adapters.implementer = implementer;
  const result = await runPoc(adapters);
  assert.equal(result.passed, false);
  assert.match(result.reason, /Final inventory validation failed/);
});

void test("missing, rejected, stale, duplicate, and unchecked review cannot approve", async () => {
  const cases: [FakeResponseStep[], RegExp][] = [
    [[check], /exactly one/],
    [[approval], /reviewer did not check/],
    [[check, approval, approval], /exactly one/],
    [[check, { toolCalls: [{ name: "submit_review", input: {
      verdict: "changes_requested", digest: "irrelevant", reason: "Needs work",
    } }] }], /requested changes/],
    [[check, { toolCalls: [{ name: "submit_review", input: {
      verdict: "approved", digest: "stale", reason: "Claimed approval",
    } }] }], /digest does not match/],
  ];
  for (const [steps, expected] of cases) {
    const adapters = demoAdapters();
    adapters.reviewer = reviewer(steps);
    const result = await runPoc(adapters);
    assert.equal(result.passed, false);
    assert.match(result.reason, expected);
  }
});

void test("model errors propagate and still remove the temporary workspace", async () => {
  const parent = await mkdtemp(join(tmpdir(), "poc-error-"));
  try {
    const adapters = demoAdapters();
    const failing = fakeText();
    failing.setResponses([{ error: "Provider unavailable" }]);
    adapters.implementer = failing;
    await assert.rejects(runPoc(adapters, parent), /Provider unavailable/);
    assert.deepEqual(await readdir(parent), []);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

void test("CLI fails before inference for missing live credentials or unknown arguments", () => {
  for (const [args, expected] of [["--live", /ANTHROPIC_API_KEY/], ["--unknown", /Usage:/]] as const) {
    const child = spawnSync(process.execPath,
      ["--import", "tsx", "scripts/poc/tanstack-cli.ts", args],
      { encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 15000 });
    assert.equal(child.status, 1, child.stderr);
    assert.match(child.stderr, expected);
    assert.equal(child.stdout, "");
  }
});
