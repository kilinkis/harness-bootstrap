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

  assert.deepEqual(manifest.scripts?.feedback?.split(" && "), [
    "pnpm run check:harness-state",
    "pnpm run check:review-binding",
    "pnpm run check:targets",
    "pnpm run check",
    "pnpm run lint",
    "pnpm run analyze:changes",
    "pnpm run test:product",
  ]);
  assert.deepEqual(manifest.scripts?.verify?.split(" && "), [
    "pnpm run feedback",
    "pnpm run test:harness",
  ]);
  assert.deepEqual(manifest.scripts?.["verify:docs"]?.split(" && "), [
    "pnpm run check:harness-state",
    "pnpm run check:review-binding",
    "pnpm run check:targets",
    "pnpm run test:harness:docs",
  ]);
  assert.deepEqual(manifest.scripts?.["test:harness:docs"]?.split(" ").slice(2), [
    "tests/harness/adoption-guidance.test.ts",
    "tests/harness/impact-analysis.test.ts",
    "tests/harness/local-verification.test.ts",
    "tests/harness/repair-loop.test.ts",
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
  assert.equal(manifest.scripts?.verify, "pnpm run feedback && pnpm run test:harness");
});

void test("workflow guidance protects the low-risk and streamlined lanes", async () => {
  const [agents, ticket, verification, checkpoints, implementer, reviewer, leader, request] =
    await Promise.all([
      readRepositoryFile("AGENTS.md"),
      readRepositoryFile("docs/run-a-ticket.md"),
      readRepositoryFile("docs/verification.md"),
      readRepositoryFile("CHECKPOINTS.md"),
      readRepositoryFile("agents/implementer.md"),
      readRepositoryFile("agents/reviewer.md"),
      readRepositoryFile("agents/leader.md"),
      readRepositoryFile(".github/pull_request_template.md"),
    ]);

  assert.match(ticket, /Low-risk documentation lane/);
  assert.match(ticket, /allowlist contains only `docs\/task-cli\.md`/i);
  assert.match(ticket, /Root documents.*process documents.*excluded/i);
  assert.match(ticket, /does not activate a feature|do not activate a feature/i);
  assert.match(ticket, /change-request review/i);
  assert.match(ticket, /required full CI/i);
  assert.match(request, /low-risk documentation lane/i);
  assert.match(agents, /at most five acceptance criteria/i);
  assert.match(ticket, /300 added implementation lines/i);
  assert.match(ticket, /named owner/i);
  assert.match(implementer, /focused check.*fast feedback/is);
  assert.doesNotMatch(implementer, /then `\.\/scripts\/verify\.sh`/);
  assert.match(reviewer, /independent focused/i);
  assert.match(leader, /after.*approv.*\.\/scripts\/verify\.sh/is);
  assert.match(checkpoints, /after independent approval/i);
  assert.match(verification, /evidence-only finalization/i);
  assert.match(verification, /no feature is active.*only.*docs\/task-cli\.md.*all other changes.*latest completed tracked approval/i);
});

async function readRepositoryFile(relativePath: string): Promise<string> {
  return readFile(new URL(relativePath, `file://${REPOSITORY_ROOT}/`), "utf8");
}
