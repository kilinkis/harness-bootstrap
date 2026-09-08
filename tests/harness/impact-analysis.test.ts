import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { analyzeImpact } from "../../scripts/impact-analysis.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TSX_BINARY = join(
  REPOSITORY_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

void test("a direct application change affects only its target", async () => {
  const root = await createWorkspaceFixture();

  try {
    const result = await analyzeImpact(root, ["apps/web/src/page.tsx"]);
    assert.deepEqual(paths(result), ["apps/web"]);
    assert.deepEqual(result.affectedTargets[0]?.commands.map(({ kind }) => kind), [
      "typecheck",
      "test",
      "build",
    ]);
    assert.equal(result.fullGateRequired, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a package change affects transitive workspace consumers", async () => {
  const root = await createWorkspaceFixture();

  try {
    const result = await analyzeImpact(root, ["packages/core/src/index.ts"]);
    assert.deepEqual(paths(result), ["apps/web", "packages/core", "packages/ui"]);
    assert.match(
      result.affectedTargets.find(({ path }) => path === "apps/web")?.reasons[0] ?? "",
      /depends on packages\/ui/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("root package configuration affects every target", async () => {
  const root = await createWorkspaceFixture();

  try {
    const result = await analyzeImpact(root, ["package.json"]);
    assert.deepEqual(paths(result), [
      ".",
      "apps/web",
      "packages/core",
      "packages/ui",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("an unsafe changed path produces uncertainty", async () => {
  const root = await createWorkspaceFixture();

  try {
    const result = await analyzeImpact(root, ["../outside.ts"]);
    assert.deepEqual(result.affectedTargets, []);
    assert.match(result.uncertainties[0] ?? "", /outside the repository contract/);
    assert.equal(result.fullGateRequired, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("an incomplete inventory produces command uncertainty", async () => {
  const root = await createWorkspaceFixture();

  try {
    const inventoryPath = join(root, "harness.targets.json");
    const inventory = JSON.parse(await readFile(inventoryPath, "utf8")) as {
      targets: { path: string }[];
    };
    inventory.targets = inventory.targets.filter(({ path }) => path !== "packages/core");
    await writeFile(inventoryPath, JSON.stringify(inventory));

    const result = await analyzeImpact(root, ["packages/core/src/index.ts"]);
    const core = result.affectedTargets.find(({ path }) => path === "packages/core");
    assert.deepEqual(core?.commands, []);
    assert.ok(result.uncertainties.some((item) => item.startsWith("TARGET_NOT_DECLARED:")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the optional guide keeps the merge gate mandatory", async () => {
  const agentGuide = await readFile(join(REPOSITORY_ROOT, "AGENTS.md"), "utf8");
  const impactGuide = await readFile(
    join(REPOSITORY_ROOT, "docs", "impact-analysis.md"),
    "utf8",
  );

  assert.match(agentGuide, /Optional affected-target analysis/);
  assert.match(agentGuide, /`docs\/impact-analysis\.md`/);
  assert.match(impactGuide, /advisory/i);
  assert.match(impactGuide, /does not replace the full merge gate/i);
  assert.match(impactGuide, /Always run `\.\/scripts\/verify\.sh`/);
});

void test("the JSON command reads changed paths from an explicit Git base", async () => {
  const root = await createWorkspaceFixture();

  try {
    await runGit(root, ["init", "--quiet"]);
    await runGit(root, ["add", "."]);
    await commitFixture(root);
    await writeFile(join(root, "packages/ui/src/index.ts"), "export const ui = 2;\n");
    await writeFile(join(root, "apps/web/src/new.ts"), "export const added = true;\n");

    const output = await runImpactCommand(root);
    const result = JSON.parse(output) as {
      changedPaths: string[];
      affectedTargets: { path: string }[];
    };
    assert.deepEqual(result.changedPaths, [
      "apps/web/src/new.ts",
      "packages/ui/src/index.ts",
    ]);
    assert.deepEqual(result.affectedTargets.map(({ path }) => path), [
      "apps/web",
      "packages/ui",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a staged cross-target rename includes both target paths", async () => {
  const root = await createWorkspaceFixture();

  try {
    await runGit(root, ["init", "--quiet"]);
    await runGit(root, ["add", "."]);
    await commitFixture(root);
    await rename(
      join(root, "packages/core/src/index.ts"),
      join(root, "apps/web/src/core.ts"),
    );
    await runGit(root, ["add", "--all"]);

    const result = JSON.parse(await runImpactCommand(root)) as {
      affectedTargets: { path: string }[];
    };
    assert.deepEqual(result.affectedTargets.map(({ path }) => path), [
      "apps/web",
      "packages/core",
      "packages/ui",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createWorkspaceFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "impact-analysis-"));
  const packages = [
    packageDefinition(".", "workspace-root", {}),
    packageDefinition("packages/core", "@example/core", {}),
    packageDefinition("packages/ui", "@example/ui", {
      "@example/core": "workspace:*",
    }),
    packageDefinition("apps/web", "@example/web", {
      "@example/ui": "workspace:*",
    }),
  ];
  const files: Record<string, string> = {
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n  - "packages/*"\n',
    "harness.targets.json": JSON.stringify({
      version: 1,
      targets: packages.map(({ path, name }) => inventoryTarget(path, name)),
    }),
  };
  for (const definition of packages) {
    const prefix = definition.path === "." ? "" : `${definition.path}/`;
    files[`${prefix}package.json`] = JSON.stringify(definition.manifest);
    files[`${prefix}src/index.ts`] = "export const value = 1;\n";
  }
  await writeFixtureFiles(root, files);
  return root;
}

function packageDefinition(
  path: string,
  name: string,
  dependencies: Record<string, string>,
): { path: string; name: string; manifest: Record<string, unknown> } {
  return {
    path,
    name,
    manifest: { name, dependencies, scripts: packageScripts(name) },
  };
}

function packageScripts(name: string): Record<string, string> {
  return {
    typecheck: "tsc --noEmit",
    test: "tsx --test",
    ...(name === "@example/web" ? { build: "vite build" } : {}),
  };
}

function inventoryTarget(path: string, packageName: string): Record<string, unknown> {
  const prefix = path === "." ? "pnpm run" : `pnpm --filter ${packageName} run`;
  return {
    path,
    packageName,
    deployable: path === "apps/web",
    typecheck: { command: `${prefix} typecheck` },
    test: { command: `${prefix} test` },
    build: path === "apps/web"
      ? { command: `${prefix} build` }
      : { notApplicable: "This fixture target is not deployed." },
  };
}

async function writeFixtureFiles(
  root: string,
  files: Record<string, string>,
): Promise<void> {
  for (const [relativePath, contents] of Object.entries(files)) {
    const path = join(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  }
}

function paths(result: Awaited<ReturnType<typeof analyzeImpact>>): string[] {
  return result.affectedTargets.map(({ path }) => path);
}

function runGit(root: string, args: string[]): Promise<void> {
  return new Promise((resolveRun, reject) => {
    execFile("git", args, { cwd: root }, (error) => {
      if (error) reject(new Error(error.message));
      else resolveRun();
    });
  });
}

function commitFixture(root: string): Promise<void> {
  return runGit(root, [
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.test",
    "commit",
    "--quiet",
    "-m",
    "Create fixture",
  ]);
}

function runImpactCommand(root: string): Promise<string> {
  return new Promise((resolveOutput, reject) => {
    const child = spawn(TSX_BINARY, [
      join(REPOSITORY_ROOT, "scripts/analyze-impact.ts"),
      "--json",
      "--base",
      "HEAD",
      root,
    ]);
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolveOutput(stdout);
      else reject(new Error(stderr));
    });
  });
}
