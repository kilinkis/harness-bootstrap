import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { resolveFinalReviewPath } from "../../scripts/final-review.js";
import { validateHarnessState } from "../../scripts/check-harness-state.js";
import { computeImplementationDigest, validateReviewBinding } from "../../scripts/review-binding.js";
import { createFixture, writeFeatureQueue } from "./review-binding-fixture.js";

void test("numbered approvals cannot override a rejected or incomplete final report", async () => {
  for (const rejection of ["verdict", "evidence", "identity"]) {
    const root = await createFixture();
    try {
      const report = await completeFixture(root);
      await writeFile(join(root, "progress/review_TASK-100_round1.md"), report);
      const invalidReport = rejection === "verdict"
        ? report.replace("Approved.", "Changes requested.")
        : rejection === "evidence"
          ? report.replace("## Commands and results", "## Notes")
          : report.replaceAll("TASK-100", "TASK-999");
      await writeFile(join(root, "progress/review_TASK-100.md"), invalidReport);
      const expectedCode = { verdict: "REVIEW_APPROVAL_MISSING", evidence: "REPORT_SECTION_MISSING",
        identity: "REPORT_FEATURE_MISSING" }[rejection];
      assert.ok((await validateHarnessState(root)).some(({ code }) => code === expectedCode), rejection);
      assert.ok((await validateReviewBinding(root)).some(({ code }) => code === expectedCode), rejection);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

void test("a numbered report cannot replace the missing canonical final report", async () => {
  const root = await createFixture();
  try {
    const report = await completeFixture(root);
    await writeFile(join(root, "progress/review_TASK-100_round1.md"), report);
    await rm(join(root, "progress/review_TASK-100.md"));
    assert.ok((await validateHarnessState(root)).some(({ code }) => code === "REVIEW_REPORT_MISSING"));
    assert.ok((await validateReviewBinding(root)).some(({ code }) => code === "REVIEW_BINDING_MISSING"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a complete canonical approval passes independently of numbered rounds", async () => {
  const root = await createFixture();
  try {
    const report = await completeFixture(root);
    await writeFile(join(root, "progress/review_TASK-100_round1.md"), report.replace("Approved.", "Changes requested."));
    assert.deepEqual(await validateHarnessState(root), []);
    assert.deepEqual(await validateReviewBinding(root), []);
    await writeFeatureQueue(root, "in_review");
    await writeFile(join(root, "progress/current.md"), "TASK-100 is in review.\n");
    assert.deepEqual(await validateReviewBinding(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function completeFixture(root: string): Promise<string> {
  await writeFeatureQueue(root, "done");
  await writeFile(join(root, "progress/history.md"), "# History\nTASK-100 completed.\n");
  await writeFile(join(root, "progress/impl_TASK-100.md"), [
    "# Implementation TASK-100", "## Scope", "Fixture implementation.",
    "## Files changed", "src/value.ts", "## Commands and results", "Focused checks passed.",
    "## Remaining risks", "None.",
  ].join("\n"));
  const digest = await computeImplementationDigest(root);
  const report = ["# Review TASK-100", "## Verdict", "Approved.", "## Scope reviewed",
    "Fixture implementation.", "## Commands and results", "Focused checks passed.",
    "## Remaining risks", "None.", `Implementation digest: ${digest}`, ""].join("\n");
  await writeFile(join(root, "progress/review_TASK-100.md"), report);
  return report;
}

void test("historical final paths require unchanged original and final evidence", async () => {
  for (const [id, suffix] of [["TASK-005", "_followup"], ["TASK-009", "_followup"],
    ["TASK-011", "_followup"], ["TASK-022", "_round1"]] as const) {
    const root = await createFixture();
    const canonicalPath = `progress/review_${id}.md`;
    const historicalPath = `progress/review_${id}${suffix}.md`;
    try {
      const original = await readFile(new URL(`../../${canonicalPath}`, import.meta.url), "utf8");
      const final = await readFile(new URL(`../../${historicalPath}`, import.meta.url), "utf8");
      await writeFile(join(root, canonicalPath), original);
      await writeFile(join(root, historicalPath), final);
      assert.equal(await resolveFinalReviewPath(root, id), historicalPath);
      await writeFile(join(root, canonicalPath), `${original}\nNew review: changes requested.\n`);
      assert.equal(await resolveFinalReviewPath(root, id), canonicalPath);
      await writeFile(join(root, canonicalPath), original);
      await writeFile(join(root, historicalPath), `${final}\nChanged evidence.\n`);
      assert.equal(await resolveFinalReviewPath(root, id), canonicalPath);
      await rm(join(root, historicalPath));
      assert.equal(await resolveFinalReviewPath(root, id), canonicalPath);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});
