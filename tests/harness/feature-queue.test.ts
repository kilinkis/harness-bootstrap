import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { validateHarnessState } from "../../scripts/check-harness-state.js";
import { validateReviewBinding } from "../../scripts/review-binding.js";
import { addReviewReport, createFixture } from "./review-binding-fixture.js";

void test("state and binding reject invalid queues with shared diagnostic detail", async () => {
  const root = await createFixture();
  const valid = { id: "TASK-100", title: "Fixture", status: "pending", acceptance_criteria: ["Works."] };
  const cases: [unknown, string][] = [
    [{}, "QUEUE_INVALID_SHAPE"], [[null], "FEATURE_INVALID_SHAPE"],
    [[{ status: "in_review" }], "FEATURE_ID_MISSING"],
    [[{ ...valid, id: "../escape" }], "FEATURE_ID_INVALID"],
    [[valid, { ...valid, id: " TASK-100 " }], "FEATURE_ID_DUPLICATE"],
    [[{ ...valid, status: "unknown" }], "FEATURE_STATUS_INVALID"],
    [[{ ...valid, title: " " }], "FEATURE_TITLE_MISSING"],
    [[{ ...valid, acceptance_criteria: [] }], "FEATURE_ACCEPTANCE_MISSING"],
    [[{ ...valid, status: "in_progress", acceptance_criteria: Array(6).fill("Works.") }], "FEATURE_ACCEPTANCE_LIMIT"],
    [[{ ...valid, status: "skipped" }], "FEATURE_SKIP_REASON_MISSING"],
    [[{ ...valid, status: "done" }], "FEATURE_ISSUE_MISSING"],
    [[{ ...valid, issue: " " }], "FEATURE_ISSUE_INVALID"],
    [[{ ...valid, status: "in_progress" }, { ...valid, id: "TASK-101", status: "in_review" }], "ACTIVE_FEATURE_LIMIT"],
  ];
  try {
    for (const [queue, expected] of cases) {
      await writeFile(join(root, "feature_list.json"), JSON.stringify(queue));
      const state = (await validateHarnessState(root)).filter(({ path }) => path === "feature_list.json");
      assert.ok(state.some(({ code }) => code === expected), expected);
      assert.deepEqual(await validateReviewBinding(root), state.map((finding) => ({
        ...finding, code: finding.code.startsWith("QUEUE_") ? "REVIEW_BINDING_QUEUE_INVALID"
          : finding.code.startsWith("FEATURE_ISSUE_") ? "REVIEW_BINDING_ISSUE_MISSING" : finding.code,
      })), expected);
    }
    await writeFile(join(root, "feature_list.json"), "{");
    assert.equal((await validateHarnessState(root))[0]?.code, "QUEUE_INVALID_JSON");
    assert.equal((await validateReviewBinding(root))[0]?.code, "REVIEW_BINDING_QUEUE_INVALID");
    await rm(join(root, "feature_list.json"));
    assert.equal((await validateHarnessState(root))[0]?.code, "QUEUE_READ_FAILED");
    assert.equal((await validateReviewBinding(root))[0]?.code, "REVIEW_BINDING_QUEUE_INVALID");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("state and binding use the same normalized feature identity", async () => {
  const root = await createFixture();
  try {
    const queue = JSON.parse(await readFile(join(root, "feature_list.json"), "utf8")) as { id: string }[];
    if (queue[0]) queue[0].id = "  TASK-100 \t";
    await writeFile(join(root, "feature_list.json"), JSON.stringify(queue));
    await writeFile(join(root, "progress/impl_TASK-100.md"), ["# TASK-100", "## Scope", "Fixture.",
      "## Files changed", "src/value.ts", "## Commands and results", "Passed.", "## Remaining risks", "None."].join("\n"));
    await addReviewReport(root);
    assert.deepEqual(await validateHarnessState(root), []);
    assert.deepEqual(await validateReviewBinding(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
