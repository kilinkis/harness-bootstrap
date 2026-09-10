import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { validateHarnessRelease } from "../../scripts/harness-release.js";

void test("a matching stable release marker passes", async () => {
  const root = await createFixture("v1.2.3\n", "# Changelog\n\n## v1.2.3 — 2026-09-10\n");

  try {
    assert.deepEqual(await validateHarnessRelease(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("an invalid release marker has a stable finding", async () => {
  const root = await createFixture("latest\n", "# Changelog\n");

  try {
    assert.deepEqual(await validateHarnessRelease(root), [
      {
        code: "HARNESS_VERSION_INVALID",
        message: "HARNESS_VERSION must contain one stable semantic version with a v prefix",
        path: "HARNESS_VERSION",
      },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a missing changelog entry has a stable finding", async () => {
  const root = await createFixture("v1.2.3\n", "# Changelog\n\n## v1.2.2\n");

  try {
    assert.deepEqual(await validateHarnessRelease(root), [
      {
        code: "HARNESS_CHANGELOG_ENTRY_MISSING",
        message: "v1.2.3: add a matching level-two heading to HARNESS_CHANGELOG.md",
        path: "HARNESS_CHANGELOG.md",
      },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createFixture(version: string, changelog: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-release-"));
  await Promise.all([
    writeFile(join(root, "HARNESS_VERSION"), version),
    writeFile(join(root, "HARNESS_CHANGELOG.md"), changelog),
  ]);
  return root;
}
