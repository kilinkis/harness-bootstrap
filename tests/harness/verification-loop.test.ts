import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));

interface PackageManifest {
  scripts?: Record<string, string>;
}

void test("the full gate contains every fast feedback check", async () => {
  const manifest = JSON.parse(
    await readRepositoryFile("package.json"),
  ) as PackageManifest;

  assert.equal(
    manifest.scripts?.feedback,
    "tsx scripts/record-gate.ts fast -- pnpm run feedback:raw",
  );
  assert.deepEqual(manifest.scripts?.["feedback:raw"]?.split(" && "), [
    "pnpm run check:harness-state",
    "pnpm run check:review-binding",
    "pnpm run check:targets",
    "pnpm run check",
    "pnpm run lint",
    "pnpm run analyze:changes",
    "pnpm run test:product",
  ]);
  assert.equal(
    manifest.scripts?.verify,
    "tsx scripts/record-gate.ts full -- pnpm run verify:raw",
  );
  assert.deepEqual(manifest.scripts?.["verify:raw"]?.split(" && "), [
    "pnpm run feedback:raw",
    "pnpm run test:harness",
  ]);
  assert.equal(
    manifest.scripts?.["verify:docs"],
    "tsx scripts/record-gate.ts docs -- pnpm run verify:docs:raw",
  );
  assert.deepEqual(manifest.scripts?.["verify:docs:raw"]?.split(" && "), [
    "pnpm run check:harness-state",
    "pnpm run check:review-binding",
    "pnpm run check:targets",
    "pnpm run test:harness:docs",
  ]);
  assert.deepEqual(manifest.scripts?.["test:harness:docs"]?.split(" ").slice(2), [
    "tests/harness/adoption-guidance.test.ts",
    "tests/harness/impact-analysis.test.ts",
    "tests/harness/local-verification.test.ts",
    "tests/harness/metrics-guidance.test.ts",
    "tests/harness/repair-loop.test.ts",
    "tests/harness/verification-loop.test.ts",
  ]);
});

void test("the shell and CI entry points use the full gate", async () => {
  const shellGate = await readRepositoryFile("scripts/verify.sh");
  const workflow = await readRepositoryFile(".github/workflows/verify.yml");

  assert.match(shellGate, /^#!\/usr\/bin\/env bash\nset -euo pipefail\n\npnpm run verify\n$/);
  assert.match(workflow, /run: \.\/scripts\/verify\.sh/);
  assert.doesNotMatch(workflow, /pnpm run feedback/);
  assert.doesNotMatch(workflow, /verify:local|verify:docs/);
});

void test("the local selector remains separate from the full gate", async () => {
  const manifest = JSON.parse(
    await readRepositoryFile("package.json"),
  ) as PackageManifest;

  assert.equal(manifest.scripts?.["verify:local"], "tsx scripts/local-verification.ts");
  assert.equal(manifest.scripts?.verify, "tsx scripts/record-gate.ts full -- pnpm run verify:raw");
});

async function readRepositoryFile(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, `file://${REPOSITORY_ROOT}/`), "utf8");
}
