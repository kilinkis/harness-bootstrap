import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { createFixture, runGit } from "./review-binding-fixture.js";

const REPOSITORY_ROOT = join(import.meta.dirname, "../..");
const ZERO_SHA = "0".repeat(40);

void test("pushed branches propagate the target baseline to Fallow and both selectors", async () => {
  const root = await analysisFixture();
  try {
    const base = await gitOutput(root, ["rev-parse", "HEAD"]);
    await runGit(root, ["checkout", "--quiet", "-b", "feature"]);
    await writeFile(join(root, "src/value.ts"), "export const value = 2;\n");
    await runGit(root, ["add", "src/value.ts"]);
    await runGit(root, ["commit", "--quiet", "-m", "Feature implementation"]);
    await runGit(root, ["update-ref", "refs/remotes/origin/feature", "HEAD"]);
    await runGit(root, ["config", "branch.feature.remote", "."]);
    await runGit(root, ["config", "branch.feature.merge", "refs/remotes/origin/feature"]);
    await runGit(root, ["checkout", "--quiet", "-b", "target", base]);
    await writeFile(join(root, "README.md"), "Target-only update.\n");
    await runGit(root, ["add", "README.md"]);
    await runGit(root, ["commit", "--quiet", "-m", "Advance target"]);
    await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    await runGit(root, ["checkout", "--quiet", "feature"]);
    const audit = await runAnalysis(root);
    assert.equal(audit.code, 0, audit.output);
    assert.deepEqual(JSON.parse(audit.output.trim().split("\n").at(-1) ?? "null"), ["audit", "--base", base]);
    const impact = await runScript(root, "analyze-impact.ts", ["--json"]);
    assert.ok((JSON.parse(impact.output) as { changedPaths: string[] }).changedPaths.includes("src/value.ts"));
    const selector = await runScript(root, "local-verification.ts", []);
    assert.equal(selector.code, 0, selector.output);
    assert.equal(selector.output.trim().split("\n").at(-1), base);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("detached CI and non-main targets use explicit overrides and reject invalid refs", async () => {
  const root = await analysisFixture();
  try {
    const base = await gitOutput(root, ["rev-parse", "HEAD"]);
    await runGit(root, ["update-ref", "refs/remotes/origin/develop", "HEAD"]);
    await writeFile(join(root, "src/value.ts"), "export const value = 3;\n");
    await runGit(root, ["add", "src/value.ts"]);
    await runGit(root, ["commit", "--quiet", "-m", "Default branch push"]);
    await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    await runGit(root, ["checkout", "--detach", "--quiet"]);
    for (const ref of [base, "origin/develop"]) {
      const result = await runAnalysis(root, ref);
      assert.equal(result.code, 0, result.output);
      assert.match(result.output, new RegExp(base));
      const impact = await runScript(root, "analyze-impact.ts", ["--json"], ref);
      assert.ok((JSON.parse(impact.output) as { changedPaths: string[] }).changedPaths.includes("src/value.ts"));
    }
    const override = await runScript(root, "local-verification.ts", ["--base", "origin/develop", "--dry-run"], "missing");
    assert.equal(override.code, 0, override.output);
    assert.match(override.output, new RegExp(base));
    const invalid = await runAnalysis(root, "missing-history");
    assert.notEqual(invalid.code, 0);
    assert.match(invalid.output, /COMPARISON_BASE_INVALID/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the first push selects full analysis and all paths instead of an empty diff", async () => {
  const root = await analysisFixture();
  try {
    const audit = await runAnalysis(root, ZERO_SHA);
    assert.equal(audit.code, 0, audit.output);
    assert.deepEqual(JSON.parse(audit.output.trim().split("\n").at(-1) ?? "null"), ["--fail-on-issues"]);
    const impact = await runScript(root, "analyze-impact.ts", ["--json"], ZERO_SHA);
    assert.ok((JSON.parse(impact.output) as { changedPaths: string[] }).changedPaths.includes("src/value.ts"));
    const selector = await runScript(root, "local-verification.ts", ["--dry-run"], ZERO_SHA);
    assert.match(selector.output, /Selected gate: feedback/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function analysisFixture(): Promise<string> {
  const root = await createFixture();
  const manifest = JSON.parse(await readFile(join(REPOSITORY_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };
  const command = (manifest.scripts["analyze:changes"] ?? "").replace("tsx scripts/", `${runner()} ${shellQuote(join(REPOSITORY_ROOT, "scripts"))}/`);
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { "analyze:changes": command,
    feedback: `${shellQuote(process.execPath)} -e 'console.log(process.env.HARNESS_BASE_REF)'`,
  } }));
  await mkdir(join(root, "bin"));
  await writeFile(join(root, "bin/fallow"), `#!${process.execPath}\nconsole.log(JSON.stringify(process.argv.slice(2)));\n`);
  await chmod(join(root, "bin/fallow"), 0o755);
  await runGit(root, ["add", "package.json", "bin/fallow"]);
  await runGit(root, ["commit", "--quiet", "-m", "Analysis commands"]);
  await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
  return root;
}

function runAnalysis(root: string, base?: string): Promise<{ code: number; output: string }> {
  return execute(root, "pnpm", ["--silent", "run", "analyze:changes"], base);
}

function runScript(root: string, script: string, args: string[], base?: string): Promise<{ code: number; output: string }> {
  return execute(root, process.execPath, ["--import", join(REPOSITORY_ROOT, "node_modules/tsx/dist/loader.mjs"),
    join(REPOSITORY_ROOT, "scripts", script), ...args], base);
}

function execute(root: string, command: string, args: string[], base?: string): Promise<{ code: number; output: string }> {
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: `${join(root, "bin")}:${join(REPOSITORY_ROOT, "node_modules/.bin")}:${process.env.PATH ?? ""}` };
  delete env.HARNESS_BASE_REF;
  if (base !== undefined) env.HARNESS_BASE_REF = base;
  return new Promise((resolveRun) => {
    execFile(command, args, { cwd: root, env }, (error, stdout, stderr) =>
      resolveRun({ code: error ? 1 : 0, output: stdout + stderr }));
  });
}

async function gitOutput(root: string, args: string[]): Promise<string> {
  const result = await execute(root, "git", args);
  assert.equal(result.code, 0, result.output);
  return result.output.trim();
}

function runner(): string {
  return `${shellQuote(process.execPath)} --import ${shellQuote(join(REPOSITORY_ROOT, "node_modules/tsx/dist/loader.mjs"))}`;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

void test("installed Fallow full analysis passes clean code and propagates findings", async () => {
  const root = await createFixture();
  try {
    await writeFile(join(root, "package.json"), '{"name":"fixture","type":"module"}');
    await writeFile(join(root, ".fallowrc.json"), JSON.stringify({ entry: ["src/value.ts"] }));
    const clean = await runScript(root, "analyze-changes.ts", [], ZERO_SHA);
    assert.equal(clean.code, 0, clean.output);
    await writeFile(join(root, "src/unused.ts"), "export const unused = 123;\n");
    const failing = await runScript(root, "analyze-changes.ts", [], ZERO_SHA);
    assert.notEqual(failing.code, 0, failing.output);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
