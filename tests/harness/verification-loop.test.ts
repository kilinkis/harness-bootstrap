import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));

interface PackageManifest {
  scripts?: Record<string, string>;
}

void test("required harness checks permit the documented project extension", async () => {
  const manifest = JSON.parse(
    await readRepositoryFile("package.json"),
  ) as PackageManifest;

  assert.deepEqual(manifest.scripts?.feedback?.split(" && "), [
    "pnpm run check:harness-state",
    "pnpm run check:release",
    "pnpm run check:review-binding",
    "pnpm run check:targets",
    "pnpm run check",
    "pnpm run lint",
    "pnpm run analyze:changes",
    "pnpm run test:product",
  ]);
  assertFullGateComposition(manifest.scripts);
  assert.deepEqual(manifest.scripts?.["verify:docs"]?.split(" && "), [
    "pnpm run check:harness-state",
    "pnpm run check:release",
    "pnpm run check:review-binding",
    "pnpm run check:targets",
    "pnpm run test:harness:docs",
  ]);
});

void test("sample bootstrap retains its optional documentation and metrics commands", async () => {
  const manifest = JSON.parse(await readRepositoryFile("package.json")) as PackageManifest;
  assert.deepEqual(manifest.scripts?.["test:harness:docs"]?.split(" ").slice(2), [
    "tests/harness/adoption-guidance.test.ts",
    "tests/harness/harness-release.test.ts",
    "tests/harness/impact-analysis.test.ts",
    "tests/harness/local-verification.test.ts",
    "tests/harness/verification-loop.test.ts",
  ]);
  assert.equal(manifest.scripts?.["test:harness:metrics"], "tsx --test tests/metrics/*.test.ts");
  assert.equal(manifest.scripts?.["metrics:gate"], "tsx scripts/record-gate.ts");
  for (const command of ["feedback", "verify:docs", "verify", "test:harness"]) {
    assert.doesNotMatch(manifest.scripts?.[command] ?? "", /record-gate|tests\/metrics/);
  }
});

void test("the shell and CI entry points use the full gate", async () => {
  const shellGate = await readRepositoryFile("scripts/verify.sh");
  const workflow = await readRepositoryFile(".github/workflows/verify.yml");

  assert.match(shellGate, /HARNESS_DELIVERY_PHASE="\$phase" pnpm run verify/);
  assert.match(workflow, /run: \.\/scripts\/verify\.sh ci/);
  assert.match(workflow, /HARNESS_BASE_REF:.*github\.event\.pull_request\.base\.sha.*github\.event\.before/);
  assert.doesNotMatch(workflow, /pnpm run feedback/);
  assert.doesNotMatch(workflow, /verify:local|verify:docs/);
});

void test("the local selector remains separate from the full gate", async () => {
  const manifest = JSON.parse(
    await readRepositoryFile("package.json"),
  ) as PackageManifest;

  assert.equal(manifest.scripts?.["verify:local"], "tsx scripts/local-verification.ts");
  assertFullGateComposition(manifest.scripts);
});

async function readRepositoryFile(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, `file://${REPOSITORY_ROOT}/`), "utf8");
}

function assertFullGateComposition(scripts: Record<string, string> | undefined): void {
  const commands = scripts?.verify?.split(/\s*&&\s*/);
  const project = "pnpm run verify:project";
  const hasProject = commands?.includes(project);
  assert.deepEqual(commands, ["pnpm run check:delivery", "pnpm run feedback",
    ...(hasProject ? [project] : []), "pnpm run test:harness"]);
  if (hasProject) assert.ok(scripts?.["verify:project"]?.trim(), "Define the project verification command");
}
