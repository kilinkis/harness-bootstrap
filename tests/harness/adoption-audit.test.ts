import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditAdoption } from "../../scripts/adoption-audit.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TSX_BINARY = join(
  REPOSITORY_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

void test("a single frontend package produces a reviewable proposal", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      name: "single-app",
      dependencies: { react: "latest" },
      scripts: {
        typecheck: "tsc --noEmit",
        test: "tsx --test",
        build: "vite build",
        "verify:project": "pnpm run typecheck && pnpm run test && pnpm run build",
        verify: "pnpm run verify:project",
      },
    }),
    "tsconfig.json": "{}",
  });

  try {
    const result = await auditAdoption(root);

    assert.equal(result.targets.length, 1);
    assert.deepEqual(result.targets[0]?.frontendIndicators, ["react"]);
    assert.equal(result.targets[0]?.deployment, "review_required");
    assert.deepEqual(result.proposedInventory.targets[0]?.build, {
      command: "pnpm run build",
    });
    assert.deepEqual(codes(result), [
      "DEPLOYMENT_DECISION_REQUIRED",
      "TARGET_INVENTORY_MISSING",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a pnpm workspace reports every TypeScript target", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({
      name: "workspace-root",
      scripts: {
        "verify:project": "pnpm -r test",
        verify: "pnpm run verify:project",
      },
    }),
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n  - "packages/*"\n',
    "apps/web/package.json": JSON.stringify({
      name: "@example/web",
      dependencies: { next: "latest", react: "latest" },
      scripts: { build: "next build", test: "tsx --test" },
    }),
    "apps/web/tsconfig.json": "{}",
    "packages/shared/package.json": JSON.stringify({
      name: "@example/shared",
      scripts: { typecheck: "tsc --noEmit", test: "tsx --test" },
    }),
    "packages/shared/tsconfig.build.json": "{}",
  });

  try {
    const result = await auditAdoption(root);

    assert.deepEqual(result.targets.map(({ path }) => path), [
      ".",
      "apps/web",
      "packages/shared",
    ]);
    assert.deepEqual(result.targets[1]?.frontendIndicators, ["next", "react"]);
    assert.deepEqual(result.proposedInventory.targets[1]?.build, {
      command: "pnpm --filter @example/web run build",
    });
    assert.ok(codes(result).includes("ROOT_TYPECHECK_COVERAGE_UNCONFIRMED"));
    assert.ok(codes(result).includes("TYPECHECK_DECISION_REQUIRED"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("malformed package data produces a stable finding", async () => {
  const root = await createFixture({ "package.json": "{" });

  try {
    const result = await auditAdoption(root);
    assert.equal(result.targets.length, 0);
    assert.ok(codes(result).includes("PACKAGE_JSON_INVALID"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("an unmatched workspace pattern produces a stable finding", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ name: "workspace-root" }),
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n',
  });

  try {
    const result = await auditAdoption(root);
    assert.ok(codes(result).includes("WORKSPACE_PATTERN_UNRESOLVED"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a workspace pattern cannot leave the repository", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ name: "workspace-root" }),
    "pnpm-workspace.yaml": 'packages:\n  - "../*"\n',
  });

  try {
    const result = await auditAdoption(root);
    assert.deepEqual(result.targets.map(({ path }) => path), ["."]);
    assert.ok(codes(result).includes("WORKSPACE_PATTERN_UNSAFE"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the JSON command does not change the audited repository", async () => {
  const root = await createFixture({
    "package.json": JSON.stringify({ name: "read-only-fixture" }),
  });

  try {
    const before = await snapshot(root);
    const result = await runAudit(root);
    const after = await snapshot(root);

    assert.equal(result.exitCode, 1, result.stderr);
    assert.doesNotThrow(() => {
      JSON.parse(result.stdout);
    });
    assert.deepEqual(after, before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("invalid command arguments report a concise error", async () => {
  const result = await runAuditArguments(["--unknown"]);

  assert.equal(result.exitCode, 1);
  assert.equal(
    result.stderr,
    "Usage: audit-adoption [--json] [repository-root]\n",
  );
  assert.doesNotMatch(result.stderr, /at parseOptions/);
});

async function createFixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "adoption-audit-"));
  for (const [relativePath, contents] of Object.entries(files)) {
    const path = join(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  }
  return root;
}

function codes(result: Awaited<ReturnType<typeof auditAdoption>>): string[] {
  return result.findings.map(({ code }) => code);
}

async function snapshot(root: string): Promise<Record<string, string>> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile());
  const pairs: [string, string][] = await Promise.all(files.map(async (entry) => {
    const path = join(entry.parentPath, entry.name);
    return [path.slice(root.length + 1), await readFile(path, "utf8")];
  }));
  return Object.fromEntries(pairs);
}

function runAudit(
  root: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return runAuditArguments(["--json", root]);
}

function runAuditArguments(
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(TSX_BINARY, [
      join(REPOSITORY_ROOT, "scripts/audit-adoption.ts"),
      ...args,
    ]);
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolveResult({ exitCode: exitCode ?? -1, stdout, stderr });
    });
  });
}
