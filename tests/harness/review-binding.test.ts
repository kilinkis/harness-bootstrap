import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "review-binding-"));
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "progress"), { recursive: true });
  await mkdir(join(root, ".github/workflows"), { recursive: true });
  await writeFeatureQueue(root, "in_review");
  await writeFile(join(root, "src/value.ts"), "export const value = 1;\n");
  await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "fixture",
    scripts: { test: "node --test" },
    devDependencies: { typescript: "^5.9.0" },
  }));
  await writeFile(join(root, ".github/workflows/verify.yml"), [
    "jobs:",
    "  verify:",
    "    steps:",
    "      - uses: pnpm/action-setup@v6",
    "        with:",
    "          version: 10.34.5",
  ].join("\n"));
  await writeFile(join(root, "progress/current.md"), "TASK-100 is in review.\n");
  await runGit(root, ["init", "--quiet"]);
  await runGit(root, ["config", "user.email", "fixture@example.test"]);
  await runGit(root, ["config", "user.name", "Fixture"]);
  await runGit(root, ["add", "."]);
  await runGit(root, ["commit", "--quiet", "-m", "Initial fixture"]);
  await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
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

async function finalizeFeature(root: string): Promise<void> {
  await writeFeatureQueue(root, "done");
  await writeFile(join(root, "progress/current.md"), "No feature is active.\n");
  await runGit(root, ["add", "feature_list.json", "progress"]);
  await runGit(root, ["commit", "--quiet", "-m", "Complete feature"]);
  await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
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
