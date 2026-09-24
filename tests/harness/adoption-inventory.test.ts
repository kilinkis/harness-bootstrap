import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  auditAdoption,
  validateTargetInventory,
} from "../../scripts/adoption-audit.js";
import type { AdoptionFinding, InventoryTarget } from "../../scripts/adoption-audit-types.js";
import { readTargetInventory } from "../../scripts/adoption-inventory.js";

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

void test("inventory decisions reject invalid shapes in every decision slot", async () => {
  const invalid: unknown[] = [
    { command: "node check.mjs", notApplicable: "" },
    { command: "node check.mjs", notApplicable: 42 },
    { command: "node check.mjs", notApplicable: null },
    { command: "", notApplicable: "No TypeScript" },
    { command: false, notApplicable: "No TypeScript" },
    { command: "node check.mjs", notApplicable: "No TypeScript" },
    {}, null, [], "node check.mjs",
    { command: " \t\n" }, { notApplicable: " \t\n" },
    { command: 42 }, { notApplicable: false },
    { command: "node check.mjs", extra: true },
  ];
  const root = await createFixture({});
  try {
    for (const slot of ["typecheck", "test", "build"] as const) {
      for (const decision of invalid) {
        await writeFile(join(root, "harness.targets.json"), JSON.stringify({
          version: 1, targets: [{ ...validTarget(), [slot]: decision }],
        }));
        const findings: AdoptionFinding[] = [];
        const parsed = await readTargetInventory(root, findings);
        const context = `${slot}: ${JSON.stringify(decision)}`;
        assert.deepEqual(parsed?.targets, [], context);
        assert.deepEqual(findings.map(({ code }) => code), ["TARGET_DECISION_INVALID"], context);
        assert.ok(findings[0]?.message.includes(`.${slot}`), context);
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("inventory decisions preserve either valid alternative in every slot", async () => {
  const root = await createFixture({});
  try {
    for (const slot of ["typecheck", "test", "build"] as const) {
      for (const decision of [
        { command: "  node check.mjs --flag='a b'  " },
        { notApplicable: "  This target does not require this check.  " },
      ]) {
        const target = { ...validTarget(), [slot]: decision };
        await writeFile(join(root, "harness.targets.json"), inventory([target]));
        const findings: AdoptionFinding[] = [];
        const parsed = await readTargetInventory(root, findings);
        assert.deepEqual(findings, []);
        assert.deepEqual(parsed?.targets, [target]);
      }
    }
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
      verify: "pnpm run check:delivery && pnpm run feedback && pnpm run verify:project && pnpm run test:harness",
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
