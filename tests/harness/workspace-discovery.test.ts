import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { auditAdoption, validateTargetInventory } from "../../scripts/adoption-audit.js";

const TARGET_PATHS = [".", "apps/web", "packages/shared"];

void test("supported YAML lists preserve every workspace target", async () => {
  for (const workspace of [
    'packages:\n  - apps/*\n# Shared packages\n  - packages/* # trailing comment\n',
    'packages: ["apps/*", "packages/*"]\n',
    'packages:\n- apps/*\n\n# Shared packages\n- packages/*\n',
    'catalog:\n  react: latest\npackages:\n  - "apps/*"\n  - \'packages/*\'\n',
  ]) {
    const root = await createWorkspace(workspace);
    try {
      const result = await auditAdoption(root);
      assert.deepEqual(result.targets.map(({ path }) => path), TARGET_PATHS, workspace);
      assert.deepEqual(result.findings, [], workspace);
      assert.deepEqual(await validateTargetInventory(root), [], workspace);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

void test("comments cannot hide an undeclared target from the inventory gate", async () => {
  const root = await createWorkspace('packages:\n  - apps/*\n# Shared packages\n  - packages/*\n');
  try {
    await writeInventory(root, [".", "apps/web"]);
    const findings = await validateTargetInventory(root);
    assert.ok(findings.some(({ code, path }) => code === "TARGET_NOT_DECLARED" && path === "packages/shared"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("quoted hash characters are part of the workspace pattern", async () => {
  const root = await createWorkspace('packages: ["packages/ #shared"]\n');
  try {
    await mkdir(join(root, "packages/ #shared"));
    await writeFile(join(root, "packages/ #shared/package.json"), '{"name":"hash-package"}');
    const result = await auditAdoption(root);
    assert.deepEqual(result.targets.map(({ path }) => path), [".", "packages/ #shared"]);
    assert.ok(!result.findings.some(({ code }) => code.startsWith("WORKSPACE_")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("malformed and unsupported configuration never passes with a partial inventory", async () => {
  for (const workspace of [
    'packages:\n  - apps/*\n  - 42\n',
    'packages:\n  - apps/*\n  -\n',
    'packages:\n  - apps/*\n  - { path: packages/* }\n',
    'packages: "apps/*"\n',
    'packages: []\n',
    'packages: [" "]\n',
    'packages:\n  - apps/*\npackages:\n  - packages/*\n',
    'packages:\n  - apps/*\n  - "packages/*\n',
    'packages:\n  - apps/*\n  packages/*\n',
    'packages: [apps/*]\n---\npackages: [packages/*]\n',
    'packages: !custom [apps/*]\n',
    'other: true\n',
  ]) {
    const root = await createWorkspace(workspace);
    try {
      await writeInventory(root, ["."]);
      const result = await auditAdoption(root);
      assert.deepEqual(result.targets.map(({ path }) => path), ["."], workspace);
      assert.ok(result.findings.some(({ code }) => code === "WORKSPACE_CONFIG_INVALID"), workspace);
      assert.ok((await validateTargetInventory(root)).some(({ code }) => code === "WORKSPACE_CONFIG_INVALID"), workspace);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

void test("unsupported exclusion patterns remain explicit findings", async () => {
  const root = await createWorkspace('packages: ["apps/*", "!packages/*"]\n');
  try {
    const result = await auditAdoption(root);
    assert.ok(result.findings.some(({ code }) => code === "WORKSPACE_PATTERN_UNSUPPORTED"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createWorkspace(workspace: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "workspace-discovery-"));
  for (const path of TARGET_PATHS) {
    await mkdir(join(root, path), { recursive: true });
    await writeFile(join(root, path, "package.json"), JSON.stringify({
      name: path,
      scripts: { "verify:project": "node --test", verify: "pnpm run verify:project" },
    }));
  }
  await writeFile(join(root, "pnpm-workspace.yaml"), workspace);
  await writeInventory(root, TARGET_PATHS);
  return root;
}

async function writeInventory(root: string, paths: string[]): Promise<void> {
  await writeFile(join(root, "harness.targets.json"), JSON.stringify({
    version: 1,
    targets: paths.map((path) => ({
      path, packageName: path, deployable: false,
      typecheck: { notApplicable: "The fixture contains no TypeScript." },
      test: { command: "node --test" },
      build: { notApplicable: "The fixture is not deployed." },
    })),
  }));
}
