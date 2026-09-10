import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { validateReviewBinding } from "../../scripts/review-binding.js";
import { addReviewReport, codes, createFixture, finalizeFeature, runGit,
  writeFeatureQueue } from "./review-binding-fixture.js";

void test("maintenance remains valid across sequential default-branch advances", async () => {
  const root = await createFixture();
  try {
    await addReviewReport(root);
    await finalizeFeature(root);
    await mkdir(join(root, "docs"));
    for (const [path, content] of [
      ["docs/task-cli.md", "# Task guide\n"],
      ["pnpm-lock.yaml", "lockfileVersion: '9.0'\nupdated: true\n"],
      ["docs/task-cli.md", "# Updated task guide\n"],
    ] as const) {
      await writeFile(join(root, path), content);
      await runGit(root, ["add", path]);
      assert.deepEqual(await validateReviewBinding(root), [], `before committing ${path}`);
      await runGit(root, ["commit", "--quiet", "-m", "Maintain fixture"]);
      assert.deepEqual(await validateReviewBinding(root), [], `before advancing ${path}`);
      await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
      assert.deepEqual(await validateReviewBinding(root), [], `after advancing ${path}`);
    }
    await writeFile(join(root, "progress/current.md"), "Evidence-only update.\n");
    await runGit(root, ["add", "progress/current.md"]);
    assert.deepEqual(await validateReviewBinding(root), []);
    await writeFile(join(root, "src/value.ts"), "export const value = 2;\n");
    await runGit(root, ["add", "src/value.ts"]);
    await runGit(root, ["commit", "--quiet", "-m", "Unreviewed implementation"]);
    await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("maintenance cannot hide prohibited staged manifest changes with a worktree revert", async () => {
  const root = await createFixture();
  try {
    await addReviewReport(root);
    await finalizeFeature(root);
    await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", scripts: {} }));
    await runGit(root, ["add", "package.json"]);
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "fixture", scripts: { test: "node --test" }, devDependencies: { typescript: "^7.0.0" },
    }));
    assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("maintenance fails closed when the reviewed baseline is missing or invalid", async () => {
  for (const invalid of [false, true]) {
    const root = await createFixture();
    try {
      await addReviewReport(root);
      await writeFeatureQueue(root, "done");
      if (invalid) {
        await writeFile(join(root, "src/value.ts"), "export const value = 2;\n");
        await runGit(root, ["add", "src/value.ts"]);
        await finalizeFeature(root);
      }
      await writeFile(join(root, "pnpm-lock.yaml"), "updated: true\n");
      await runGit(root, ["add", "pnpm-lock.yaml"]);
      assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_BASELINE_INVALID"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});
