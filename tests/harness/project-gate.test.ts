import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

const REPOSITORY_ROOT = join(import.meta.dirname, "../..");
const STAGES = ["check:delivery", "feedback", "verify:project", "test:harness"];

void test("the reusable verification contract accepts the documented project extension", async () => {
  const root = await createFixture();
  try {
    const result = await runContract(root);
    assert.equal(result.code, 0, result.output);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the documented extension executes every stage in order", async () => {
  const root = await createFixture();
  try {
    await installStubs(root);
    const result = await execute(root, "pnpm", ["--silent", "run", "verify"]);
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(await readTrace(root), STAGES);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a failing project or required harness stage stops subsequent work", async () => {
  for (const failedStage of STAGES) {
    const root = await createFixture();
    try {
      await installStubs(root);
      const result = await execute(root, "pnpm", ["--silent", "run", "verify"], failedStage);
      assert.notEqual(result.code, 0, failedStage);
      assert.deepEqual(await readTrace(root), STAGES.slice(0, STAGES.indexOf(failedStage) + 1));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

void test("the reusable contract rejects omitted stages and weakened failure handling", async () => {
  for (const change of [
    (command: string) => command.replace("pnpm run check:delivery && ", ""),
    (command: string) => command.replace("pnpm run feedback && ", ""),
    (command: string) => command.replace(" && pnpm run test:harness", ""),
    (command: string) => command.replace("pnpm run verify:project", "pnpm run verify:project || true"),
  ]) {
    const root = await createFixture();
    try {
      const manifest = await readManifest(root);
      manifest.scripts.verify = change(manifest.scripts.verify ?? "");
      await writeFile(join(root, "package.json"), JSON.stringify(manifest));
      assert.notEqual((await runContract(root)).code, 0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "project-gate-"));
  for (const path of ["package.json", "scripts/verify.sh", ".github/workflows/verify.yml",
    "tests/harness/verification-loop.test.ts"]) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await cp(join(REPOSITORY_ROOT, path), join(root, path));
  }
  const manifest = await readManifest(root);
  if (!manifest.scripts.verify?.includes("pnpm run verify:project")) {
    manifest.scripts.verify = (manifest.scripts.verify ?? "").replace(
      "pnpm run feedback && ", "pnpm run feedback && pnpm run verify:project && ");
  }
  manifest.scripts["verify:project"] = "node project-check.mjs";
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  return root;
}

async function installStubs(root: string): Promise<void> {
  const manifest = await readManifest(root);
  for (const stage of STAGES) {
    manifest.scripts[stage] = `${shellQuote(process.execPath)} stage.mjs ${stage}`;
  }
  await writeFile(join(root, "package.json"), JSON.stringify(manifest));
  await writeFile(join(root, "stage.mjs"), [
    'import { appendFileSync } from "node:fs";',
    'const stage = process.argv[2];',
    'appendFileSync("trace.log", stage + "\\n");',
    'if (process.env.FAIL_STAGE === stage) process.exit(7);',
  ].join("\n"));
}

async function readManifest(root: string): Promise<{ scripts: Record<string, string> }> {
  return JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
}

async function readTrace(root: string): Promise<string[]> {
  return (await readFile(join(root, "trace.log"), "utf8")).trim().split("\n");
}

function runContract(root: string): Promise<{ code: number; output: string }> {
  return execute(root, process.execPath, ["--import", join(REPOSITORY_ROOT, "node_modules/tsx/dist/loader.mjs"),
    "--test", join(root, "tests/harness/verification-loop.test.ts")]);
}

function execute(root: string, command: string, args: string[], failedStage = ""): Promise<{ code: number; output: string }> {
  const env: NodeJS.ProcessEnv = { ...process.env, FAIL_STAGE: failedStage };
  delete env.NODE_TEST_CONTEXT;
  return new Promise((resolveRun) => {
    execFile(command, args, { cwd: root, env },
      (error, stdout, stderr) => resolveRun({ code: error ? 1 : 0, output: stdout + stderr }));
  });
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
