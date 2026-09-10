import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { validateHarnessState } from "../../scripts/check-harness-state.js";
import { validateReviewBinding } from "../../scripts/review-binding.js";
import { addReviewReport, createFixture } from "./review-binding-fixture.js";

const queue = JSON.parse(await readFile(new URL("../../feature_list.json", import.meta.url), "utf8")) as Record<string, unknown>[];
const historical = queue.filter(({ id }) => ["TASK-001", "TASK-002", "TASK-004"].includes(String(id)));
const normal = { id: "TASK-100", title: "New work", status: "done", acceptance_criteria: ["Works."] };

void test("only the three preserved bootstrap definitions need no retrospective evidence", async () => {
  const root = await createFixture();
  try {
    assert.equal(historical.length, 3);
    await writeQueue(root, historical);
    assert.deepEqual(await validateHarnessState(root), []);
    assert.deepEqual(await validateReviewBinding(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("new completed work cannot omit its reference and normal evidence", async () => {
  const root = await createFixture();
  try {
    await writeQueue(root, [normal]);
    const state = (await validateHarnessState(root)).map(({ code }) => code);
    for (const code of ["FEATURE_ISSUE_MISSING", "IMPLEMENTATION_REPORT_MISSING", "REVIEW_REPORT_MISSING", "HISTORY_MISSING"]) {
      assert.ok(state.includes(code), code);
    }
    assert.ok((await validateReviewBinding(root)).some(({ code }) => code === "REVIEW_BINDING_ISSUE_MISSING"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("reused legacy IDs and altered definitions do not inherit an exemption", async () => {
  for (const original of historical) {
    for (const change of [{ title: "Replacement work" }, { acceptance_criteria: ["New scope."] }, { replacement: true }]) {
      const root = await createFixture();
      try {
        await writeQueue(root, [{ ...original, ...change }]);
        assert.ok((await validateHarnessState(root)).some(({ code }) => code === "FEATURE_ISSUE_MISSING"));
        assert.ok((await validateReviewBinding(root)).some(({ code }) => code === "REVIEW_BINDING_ISSUE_MISSING"));
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  }
});

void test("local references pass with normal evidence and cannot be removed to bypass binding", async () => {
  const root = await createFixture();
  try {
    await writeQueue(root, [{ ...normal, issue: "local-TASK-100" }]);
    await addReviewReport(root);
    await writeFile(join(root, "progress/history.md"), "TASK-100 completed.\n");
    await writeFile(join(root, "progress/impl_TASK-100.md"), ["# TASK-100", "## Scope", "Fixture.",
      "## Files changed", "src/value.ts", "## Commands and results", "Passed.", "## Remaining risks", "None."].join("\n"));
    assert.deepEqual(await validateHarnessState(root), []);
    assert.deepEqual(await validateReviewBinding(root), []);
    for (const issue of [undefined, "", "  ", 100]) {
      await writeQueue(root, [{ ...normal, issue }]);
      assert.ok((await validateHarnessState(root)).some(({ code }) => code.startsWith("FEATURE_ISSUE_")));
      assert.ok((await validateReviewBinding(root)).some(({ code }) => code === "REVIEW_BINDING_ISSUE_MISSING"));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function writeQueue(root: string, features: Record<string, unknown>[]): Promise<void> {
  await writeFile(join(root, "feature_list.json"), JSON.stringify(features));
}
