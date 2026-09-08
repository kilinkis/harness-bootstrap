import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  computeImplementationDigest,
  validateReviewBinding,
} from "../../scripts/review-binding.js";

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

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "review-binding-"));
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "progress"), { recursive: true });
  await writeFeatureQueue(root, "in_review");
  await writeFile(join(root, "src/value.ts"), "export const value = 1;\n");
  await writeFile(join(root, "progress/current.md"), "TASK-100 is in review.\n");
  await runGit(root, ["init", "--quiet"]);
  await runGit(root, ["add", "."]);
  return root;
}

async function addReviewReport(root: string): Promise<string> {
  const digest = await computeImplementationDigest(root);
  await writeFile(
    join(root, "progress/review_TASK-100.md"),
    `# Review\n\nImplementation digest: ${digest}\n`,
  );
  await runGit(root, ["add", "progress/review_TASK-100.md"]);
  return digest;
}

async function writeFeatureQueue(root: string, status: string): Promise<void> {
  await writeFile(join(root, "feature_list.json"), JSON.stringify([{
    id: "TASK-100",
    title: "Fixture",
    status,
    issue: "https://example.test/100",
    acceptance_criteria: ["The fixture works."],
  }]));
}

function runGit(root: string, args: string[]): Promise<void> {
  return new Promise((resolveRun, reject) => {
    execFile("git", args, { cwd: root }, (error) => {
      if (error) reject(new Error(error.message));
      else resolveRun();
    });
  });
}

function codes(
  findings: Awaited<ReturnType<typeof validateReviewBinding>>,
): string[] {
  return findings.map(({ code }) => code);
}
