import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { assertDeliverySnapshot, computeImplementationDigest } from "../../scripts/review-binding.js";

import { addReviewReport, createFixture, finalizeFeature, runGit,
  writeFeatureQueue } from "./review-binding-fixture.js";

const REPOSITORY_ROOT = join(import.meta.dirname, "../..");

void test("both full entry points reject development", async () => {
  const root = await deliveryFixture("in_progress");
  try {
    for (const entry of ["local", "verify"]) {
      const result = await runEntry(root, entry);
      assert.notEqual(result.code, 0, entry);
      assert.match(result.output, /DELIVERY_APPROVAL_REQUIRED/);
      assert.doesNotMatch(result.output, /HARNESS_TESTS_EXECUTED/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the local full entry rejects an in-review feature without approval", async () => {
  const root = await deliveryFixture("in_review");
  try {
    const result = await runEntry(root, "local");
    assert.notEqual(result.code, 0);
    assert.match(result.output, /REVIEW_BINDING_MISSING/);
    assert.doesNotMatch(result.output, /HARNESS_TESTS_EXECUTED/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("local approval passes before finalization while CI requires completed state", async () => {
  const root = await deliveryFixture("in_review");
  try {
    await addReviewReport(root);
    const local = await runEntry(root, "local");
    assert.equal(local.code, 0, local.output);
    assert.match(local.output, /HARNESS_TESTS_EXECUTED/);
    const ci = await runEntry(root, "ci");
    assert.notEqual(ci.code, 0);
    assert.match(ci.output, /DELIVERY_FINALIZATION_REQUIRED/);
    assert.doesNotMatch(ci.output, /HARNESS_TESTS_EXECUTED/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("CI accepts completed approval and permitted maintenance but rejects stale code", async () => {
  const root = await deliveryFixture("in_review");
  try {
    await addReviewReport(root);
    await finalizeFeature(root);
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs/task-cli.md"), "# Updated task guide\n");
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n# maintenance\n");
    await runGit(root, ["add", "docs/task-cli.md", "pnpm-lock.yaml"]);
    const maintenance = await runEntry(root, "ci");
    assert.equal(maintenance.code, 0, maintenance.output);
    await writeFile(join(root, "src/value.ts"), "export const value = 2;\n");
    await runGit(root, ["add", "src/value.ts"]);
    const stale = await runEntry(root, "ci");
    assert.notEqual(stale.code, 0);
    assert.match(stale.output, /REVIEW_BINDING_STALE/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("unknown delivery phases fail before running the full pipeline", async () => {
  const root = await deliveryFixture("in_review");
  try {
    await addReviewReport(root);
    const result = await runEntry(root, "unknown");
    assert.notEqual(result.code, 0);
    assert.match(result.output, /Usage:/);
    assert.doesNotMatch(result.output, /HARNESS_TESTS_EXECUTED/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the snapshot guard rejects content, deletion, mode, and staged-new-file changes", async () => {
  for (const change of ["content", "deletion", "mode", "staged addition"]) {
    const root = await createFixture();
    try {
      const path = join(root, "src/value.ts");
      if (change === "staged addition") {
        await writeFile(join(root, "src/new.ts"), "export const added = 1;\n");
        await runGit(root, ["add", "src/new.ts"]);
      }
      const digest = await computeImplementationDigest(root);
      await assertDeliverySnapshot(root);
      if (change === "deletion") await rm(path);
      else if (change === "mode") {
        await runGit(root, ["config", "core.fileMode", "false"]);
        await chmod(path, 0o755);
      } else {
        await writeFile(change === "staged addition" ? join(root, "src/new.ts") : path,
          "export const changed = 2;\n");
      }
      assert.equal(await computeImplementationDigest(root), digest);
      await assert.rejects(assertDeliverySnapshot(root), /DELIVERY_SNAPSHOT_MISMATCH/);
      assert.equal(await computeImplementationDigest(root), digest, "the guard must not stage changes");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

void test("direct verify stops at the snapshot guard before downstream checks", async () => {
  const root = await deliveryFixture("in_review");
  try {
    await addReviewReport(root);
    await writeFile(join(root, "src/value.ts"), "export const value = 2;\n");
    const result = await runEntry(root, "verify");
    assert.notEqual(result.code, 0);
    assert.match(result.output, /DELIVERY_SNAPSHOT_MISMATCH/);
    assert.doesNotMatch(result.output, /harness state: valid|HARNESS_TESTS_EXECUTED/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("feedback permits unstaged development and final delivery permits evidence and untracked artifacts", async () => {
  const root = await deliveryFixture("in_progress");
  try {
    await writeFile(join(root, "src/value.ts"), "export const value = 2;\n");
    const feedback = await runEntry(root, "feedback");
    assert.equal(feedback.code, 0, feedback.output);
    await runGit(root, ["add", "src/value.ts"]);
    await writeFeatureQueue(root, "in_review");
    await addReviewReport(root);
    await finalizeFeature(root);
    const queue = await readFile(join(root, "feature_list.json"), "utf8");
    await writeFile(join(root, "feature_list.json"), queue + "\n");
    await writeFile(join(root, "progress/current.md"), "No feature is active. Evidence updated.\n");
    await mkdir(join(root, "output"));
    await writeFile(join(root, "output/user-artifact.txt"), "preserve me\n");
    const digest = await computeImplementationDigest(root);
    await assertDeliverySnapshot(root);
    const result = await runEntry(root, "ci");
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /HARNESS_TESTS_EXECUTED/);
    assert.equal(await readFile(join(root, "output/user-artifact.txt"), "utf8"), "preserve me\n");
    assert.equal(await computeImplementationDigest(root), digest);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function deliveryFixture(status: string): Promise<string> {
  const root = await createFixture();
  const manifest = JSON.parse(await readFile(join(REPOSITORY_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const scripts = { ...manifest.scripts };
  for (const command of ["check:release", "check:targets", "check", "lint", "analyze:changes", "test:product", "verify:project"]) {
    scripts[command] = `${shellQuote(process.execPath)} -e ''`;
  }
  scripts["test:harness"] = `${shellQuote(process.execPath)} -e 'console.log("HARNESS_TESTS_EXECUTED")'`;
  for (const command of ["check:harness-state", "check:review-binding", "check:delivery"]) {
    scripts[command] = [process.execPath, "--import", join(REPOSITORY_ROOT, "node_modules/tsx/dist/loader.mjs"),
      join(REPOSITORY_ROOT, "scripts", `${command.replaceAll(":", "-")}.ts`)].map(shellQuote).join(" ");
  }
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "fixture", scripts }));
  await writeFeatureQueue(root, status);
  await writeFile(join(root, "progress/current.md"), `TASK-100 is ${status}.\n`);
  await writeFile(join(root, "progress/history.md"), "TASK-100 completed.\n");
  await writeFile(join(root, "progress/impl_TASK-100.md"), ["# Implementation TASK-100",
    "## Scope", "Fixture.", "## Files changed", "src/value.ts", "## Commands and results",
    "Focused checks passed.", "## Remaining risks", "None."].join("\n"));
  await runGit(root, ["add", "package.json", "feature_list.json", "progress"]);
  return root;
}

function runEntry(root: string, entry: string): Promise<{ code: number; output: string }> {
  const direct = entry === "feedback" || entry === "verify";
  const args = direct ? ["run", entry] : [join(REPOSITORY_ROOT, "scripts/verify.sh"), entry];
  return new Promise((resolveRun) => {
    execFile(direct ? "pnpm" : "bash", args, { cwd: root, env: { ...process.env, HARNESS_DELIVERY_PHASE: "local" } },
      (error, stdout, stderr) => resolveRun({ code: error ? 1 : 0, output: stdout + stderr }));
  });
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
