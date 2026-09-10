import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const REPOSITORY_ROOT = join(import.meta.dirname, "../..");
const CORE_SCRIPTS = ["verify.sh", "check-delivery.ts", "check-harness-state.ts", "harness-state-support.ts",
  "harness-evidence.ts", "review-binding.ts", "check-review-binding.ts", "final-review.ts", "legacy-bootstrap.ts",
  "dependency-maintenance.ts", "low-risk-documentation.ts", "check-harness-release.ts", "harness-release.ts",
  "check-target-inventory.ts", "adoption-audit.ts", "adoption-audit-types.ts", "adoption-findings.ts",
  "adoption-inventory.ts", "adoption-target-discovery.ts"];

void test("a fresh adoption executes a real project check and propagates its failure", async () => {
  const root = await createAdoption();
  try {
    await assert.rejects(readFile(join(root, "src/cli.ts")), { code: "ENOENT" });
    await assert.rejects(readFile(join(root, "progress/history.md")), { code: "ENOENT" });
    assert.deepEqual(JSON.parse(await readFile(join(root, "feature_list.json"), "utf8")), []);
    for (const phase of ["local", "ci"]) {
      const success = await execute(root, "bash", ["scripts/verify.sh", phase]);
      assert.equal(success.code, 0, success.output);
      assert.match(success.output, /PROJECT_CHECK_PASSED/);
      assert.match(success.output, /ADOPTED_CONTRACT_PASSED/);
      const failure = await execute(root, "bash", ["scripts/verify.sh", phase], "invalid");
      assert.notEqual(failure.code, 0);
      assert.match(failure.output, /PROJECT_CONFIGURATION_INVALID/);
      assert.doesNotMatch(failure.output, /ADOPTED_CONTRACT_PASSED/);
    }
    const unfinished = [{ id: "ADOPT-1", title: "Fresh project work", status: "in_progress",
      issue: "local-ADOPT-1", acceptance_criteria: ["The project check passes."] }];
    await writeFile(join(root, "feature_list.json"), JSON.stringify(unfinished));
    const active = await execute(root, "bash", ["scripts/verify.sh"]);
    assert.notEqual(active.code, 0);
    assert.match(active.output, /DELIVERY_APPROVAL_REQUIRED/);
    await writeFile(join(root, "feature_list.json"), "[]\n");
    await writeFile(join(root, "project.json"), '{"name":"unreviewed"}\n');
    const changed = await execute(root, "bash", ["scripts/verify.sh"]);
    assert.notEqual(changed.code, 0);
    assert.match(changed.output, /DELIVERY_SNAPSHOT_MISMATCH/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createAdoption(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "minimal-adoption-"));
  await mkdir(join(root, "scripts"));
  for (const script of CORE_SCRIPTS) {
    await cp(join(REPOSITORY_ROOT, "scripts", script), join(root, "scripts", script));
  }
  for (const [file, map] of [["legacy-bootstrap.ts", "HISTORICAL_DEFINITIONS"], ["final-review.ts", "HISTORICAL_REVIEWS"]]) {
    const path = join(root, "scripts", file ?? "");
    const source = await readFile(path, "utf8");
    const adapted = source.replace(new RegExp(`(const ${map}[^=]+= )\\{[\\s\\S]*?\\n\\};`), "$1{};");
    assert.match(adapted, new RegExp(`const ${map}[^=]+= \\{\\};`));
    await writeFile(path, adapted);
  }
  await symlink(join(REPOSITORY_ROOT, "node_modules"), join(root, "node_modules"), "dir");
  for (const file of ["HARNESS_VERSION", "HARNESS_CHANGELOG.md"]) {
    await cp(join(REPOSITORY_ROOT, file), join(root, file));
  }
  const scripts: Record<string, string> = {};
  for (const command of ["check:delivery", "check:harness-state", "check:review-binding", "check:release", "check:targets"]) {
    const file = { "check:release": "check-harness-release", "check:targets": "check-target-inventory" }[command]
      ?? command.replaceAll(":", "-");
    scripts[command] = `node --import tsx scripts/${file}.ts`;
  }
  scripts.feedback = "pnpm run check:harness-state && pnpm run check:release && pnpm run check:review-binding && pnpm run check:targets";
  scripts["verify:project"] = "node project-check.mjs";
  scripts["test:harness"] = "node --test adopted-contract.test.mjs";
  scripts.verify = "pnpm run check:delivery && pnpm run feedback && pnpm run verify:project && pnpm run test:harness";
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "adopted-project", type: "module", scripts }));
  await writeFile(join(root, "feature_list.json"), "[]\n");
  await writeFile(join(root, ".gitignore"), "node_modules/\nartifact.json\n");
  await writeFile(join(root, "project.json"), '{"name":"adopted-project"}\n');
  await writeFile(join(root, "project-check.mjs"), [
    'import assert from "node:assert/strict";', 'import { readFileSync, writeFileSync } from "node:fs";',
    'const project = JSON.parse(readFileSync("project.json", "utf8"));',
    'assert.equal(project.name, process.env.PROJECT_NAME ?? "adopted-project", "PROJECT_CONFIGURATION_INVALID");',
    'writeFileSync("artifact.json", JSON.stringify(project));', 'console.log("PROJECT_CHECK_PASSED");',
  ].join("\n"));
  await writeFile(join(root, "adopted-contract.test.mjs"), [
    'import assert from "node:assert/strict";', 'import { readFileSync } from "node:fs";',
    'assert.equal(JSON.parse(readFileSync("artifact.json", "utf8")).name, "adopted-project");',
    'console.log("ADOPTED_CONTRACT_PASSED");',
  ].join("\n"));
  await writeFile(join(root, "harness.targets.json"), JSON.stringify({ version: 1, targets: [{ path: ".",
    packageName: "adopted-project", deployable: false, typecheck: { notApplicable: "Plain JavaScript fixture." },
    test: { command: "pnpm run test:harness" }, build: { command: "pnpm run verify:project" } }] }));
  for (const args of [["init", "--quiet"], ["add", "."]]) {
    const result = await execute(root, "git", args);
    assert.equal(result.code, 0, result.output);
  }
  return root;
}

function execute(root: string, command: string, args: string[], projectName = "adopted-project"): Promise<{ code: number; output: string }> {
  const env: NodeJS.ProcessEnv = { ...process.env, PROJECT_NAME: projectName };
  delete env.NODE_TEST_CONTEXT;
  return new Promise((resolveRun) => {
    execFile(command, args, { cwd: root, env },
      (error, stdout, stderr) => resolveRun({ code: error ? 1 : 0, output: stdout + stderr }));
  });
}
