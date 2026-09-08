import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  auditAdoption,
  validateTargetInventory,
} from "../../scripts/adoption-audit.js";
import type { InventoryTarget } from "../../scripts/adoption-audit-types.js";

void test("a malformed inventory produces a stable finding", async () => {
  const root = await createFixture({
    "package.json": rootManifest(),
    "harness.targets.json": "{",
  });

  try {
    assert.ok(codes(await auditAdoption(root)).includes("TARGET_INVENTORY_INVALID"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("an inventory must declare every discovered target", async () => {
  const root = await createFixture({
    "package.json": rootManifest(),
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n',
    "apps/web/package.json": JSON.stringify({
      name: "@example/web",
      scripts: { typecheck: "tsc --noEmit", test: "tsx --test", build: "vite build" },
    }),
    "apps/web/tsconfig.json": "{}",
    "harness.targets.json": inventory([validTarget()]),
  });

  try {
    const result = await auditAdoption(root);
    assert.ok(codes(result).includes("TARGET_NOT_DECLARED"));
    assert.match(
      result.findings.find(({ code }) => code === "TARGET_NOT_DECLARED")?.message ?? "",
      /apps\/web/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("an inventory reports targets that discovery cannot find", async () => {
  const root = await createFixture({
    "package.json": rootManifest(),
    "harness.targets.json": inventory([
      validTarget(),
      validTarget({ path: "apps/removed", packageName: "@example/removed" }),
    ]),
  });

  try {
    assert.ok(codes(await auditAdoption(root)).includes("TARGET_DECLARATION_STALE"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a deployable target requires a production-build command", async () => {
  const root = await createFixture({
    "package.json": rootManifest(),
    "harness.targets.json": inventory([
      validTarget({
        deployable: true,
        build: { notApplicable: "The build is not configured yet." },
      }),
    ]),
  });

  try {
    assert.ok(
      codes(await auditAdoption(root)).includes("DEPLOYABLE_BUILD_NOT_APPLICABLE"),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("an incomplete target decision produces a stable finding", async () => {
  const target = validTarget() as unknown as Record<string, unknown>;
  target.test = {};
  const root = await createFixture({
    "package.json": rootManifest(),
    "harness.targets.json": JSON.stringify({ version: 1, targets: [target] }),
  });

  try {
    assert.ok(codes(await auditAdoption(root)).includes("TARGET_DECISION_INVALID"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the runtime contract rejects schema drift and package renames", async () => {
  const unexpected = validTarget() as InventoryTarget & { note: string };
  unexpected.note = "unsupported";
  const invalidRoot = await createFixture({
    "package.json": rootManifest(),
    "harness.targets.json": inventory([unexpected]),
  });
  const renamedRoot = await createFixture({
    "package.json": rootManifest(),
    "harness.targets.json": inventory([
      validTarget({ packageName: "old-package-name" }),
    ]),
  });

  try {
    assert.ok(codes(await auditAdoption(invalidRoot)).includes("TARGET_ENTRY_INVALID"));
    assert.ok(
      codes(await auditAdoption(renamedRoot)).includes("TARGET_PACKAGE_NAME_MISMATCH"),
    );
  } finally {
    await rm(invalidRoot, { recursive: true, force: true });
    await rm(renamedRoot, { recursive: true, force: true });
  }
});

void test("the bootstrap inventory passes its dedicated gate", async () => {
  const repositoryRoot = join(import.meta.dirname, "../..");
  assert.deepEqual(await validateTargetInventory(repositoryRoot), []);
});

void test("JSON Schema uses the runtime path and decision constraints", async () => {
  const repositoryRoot = join(import.meta.dirname, "../..");
  const schema = JSON.parse(
    await readFile(join(repositoryRoot, "harness.targets.schema.json"), "utf8"),
  ) as {
    $defs: {
      decision: { oneOf: { properties: Record<string, { pattern: string }> }[] };
      target: { properties: { path: { pattern: string } } };
    };
  };
  const pathPattern = new RegExp(schema.$defs.target.properties.path.pattern);
  const commandPattern = new RegExp(
    schema.$defs.decision.oneOf[0]?.properties.command?.pattern ?? "",
  );

  assert.match(".", pathPattern);
  assert.match("apps/web", pathPattern);
  assert.doesNotMatch("../outside", pathPattern);
  assert.doesNotMatch("apps/../outside", pathPattern);
  assert.doesNotMatch("   ", commandPattern);
});

function validTarget(overrides: Partial<InventoryTarget> = {}): InventoryTarget {
  return {
    path: ".",
    packageName: "fixture",
    deployable: false,
    typecheck: { command: "pnpm run check" },
    test: { command: "pnpm run test" },
    build: { notApplicable: "The fixture is not deployed." },
    ...overrides,
  };
}

function inventory(targets: InventoryTarget[]): string {
  return JSON.stringify({ version: 1, targets });
}

function rootManifest(): string {
  return JSON.stringify({
    name: "fixture",
    scripts: {
      "verify:project": "pnpm run check",
      verify: "pnpm run verify:project",
    },
  });
}

function codes(result: Awaited<ReturnType<typeof auditAdoption>>): string[] {
  return result.findings.map(({ code }) => code);
}

async function createFixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "target-inventory-"));
  for (const [relativePath, contents] of Object.entries(files)) {
    const path = join(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  }
  return root;
}
