import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { validateHarnessState } from "../../scripts/check-harness-state.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TSX_BINARY = join(
  REPOSITORY_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

interface FixtureFeature {
  id?: string;
  title?: string;
  status?: string;
  issue?: string;
  acceptance_criteria?: string[];
}

const IMPLEMENTATION_REPORT = `# Implementation Report — TASK-100

## Scope
Implemented the accepted change.

## Files changed
- source file

## Commands and results
- verification passed

## Remaining risks
None.
`;

const REVIEW_REPORT = `# Review Report — TASK-100

## Verdict
Approved.

## Scope reviewed
- accepted change

## Commands and results
- verification passed

## Remaining risks
None.
`;

void test("valid tracked and legacy feature state passes", async () => {
  const root = await createFixture({
    features: [
      feature({ id: "TASK-001", status: "done" }),
      feature({ id: "TASK-100", status: "done", issue: "https://example.test/100" }),
    ],
    files: {
      "progress/history.md": "# History\n\n## TASK-100\nCompleted.\n",
      "progress/impl_TASK-100.md": IMPLEMENTATION_REPORT,
      "progress/review_TASK-100.md": REVIEW_REPORT,
    },
  });

  try {
    assert.deepEqual(await validateHarnessState(root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("queue findings use stable codes", async () => {
  const root = await createFixture({
    features: [
      feature({ id: "TASK-100", status: "unknown" }),
      feature({ id: "TASK-100", title: "", acceptance_criteria: [] }),
      feature({ id: "", issue: "" }),
    ],
  });

  try {
    assert.deepEqual(codes(await validateHarnessState(root)), [
      "FEATURE_ACCEPTANCE_MISSING",
      "FEATURE_ID_DUPLICATE",
      "FEATURE_ID_MISSING",
      "FEATURE_ISSUE_INVALID",
      "FEATURE_STATUS_INVALID",
      "FEATURE_TITLE_MISSING",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("shared workstream permits only one recorded active feature", async () => {
  const root = await createFixture({
    features: [
      feature({ id: "TASK-100", status: "in_progress" }),
      feature({ id: "TASK-101", status: "in_progress" }),
    ],
    files: { "progress/current.md": "TASK-100 is active.\n" },
  });

  try {
    assert.deepEqual(codes(await validateHarnessState(root)), [
      "ACTIVE_FEATURE_LIMIT",
      "ACTIVE_FEATURE_NOT_CURRENT",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("feature identity matching rejects longer IDs", async () => {
  const root = await createFixture({
    features: [feature({ id: "TASK-100", status: "in_review" })],
    files: {
      "progress/current.md": "TASK-1000 is active.\n",
      "progress/impl_TASK-100.md": IMPLEMENTATION_REPORT.replaceAll("TASK-100", "TASK-1000"),
    },
  });

  try {
    assert.deepEqual(codes(await validateHarnessState(root)), [
      "ACTIVE_FEATURE_NOT_CURRENT",
      "REPORT_FEATURE_MISSING",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("review state requires a structured implementation report", async () => {
  const missingRoot = await createFixture({
    features: [feature({ id: "TASK-100", status: "in_review" })],
    files: { "progress/current.md": "TASK-100 is active.\n" },
  });
  const incompleteRoot = await createFixture({
    features: [feature({ id: "TASK-100", status: "in_review" })],
    files: {
      "progress/current.md": "TASK-100 is active.\n",
      "progress/impl_TASK-100.md": "# Report for TASK-100\n",
    },
  });

  try {
    assert.deepEqual(codes(await validateHarnessState(missingRoot)), [
      "IMPLEMENTATION_REPORT_MISSING",
    ]);
    assert.deepEqual(codes(await validateHarnessState(incompleteRoot)), [
      "REPORT_SECTION_MISSING",
      "REPORT_SECTION_MISSING",
      "REPORT_SECTION_MISSING",
      "REPORT_SECTION_MISSING",
    ]);
  } finally {
    await rm(missingRoot, { recursive: true, force: true });
    await rm(incompleteRoot, { recursive: true, force: true });
  }
});

void test("completed tracked state requires reports and history", async () => {
  const root = await createFixture({
    features: [
      feature({ id: "TASK-100", status: "done", issue: "https://example.test/100" }),
    ],
    files: { "progress/history.md": "# History\n" },
  });

  try {
    assert.deepEqual(codes(await validateHarnessState(root)), [
      "HISTORY_ENTRY_MISSING",
      "IMPLEMENTATION_REPORT_MISSING",
      "REVIEW_REPORT_MISSING",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("completed tracked state requires an approved verdict", async () => {
  const root = await createFixture({
    features: [
      feature({ id: "TASK-100", status: "done", issue: "https://example.test/100" }),
    ],
    files: {
      "progress/history.md": "# History\n\n## TASK-100\nCompleted.\n",
      "progress/impl_TASK-100.md": IMPLEMENTATION_REPORT,
      "progress/review_TASK-100.md": REVIEW_REPORT.replace("Approved.", "Not approved."),
    },
  });

  try {
    assert.deepEqual(codes(await validateHarnessState(root)), [
      "REVIEW_APPROVAL_MISSING",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("command adapter exits non-zero and prints stable codes", async () => {
  const root = await createFixture({
    features: [feature({ id: "", status: "pending" })],
  });

  try {
    const result = await runValidator(root);
    assert.equal(result.exitCode, 1, result.stderr);
    assert.match(result.stderr, /FEATURE_ID_MISSING:/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function feature(overrides: FixtureFeature): FixtureFeature {
  return {
    id: "TASK-100",
    title: "Test feature",
    status: "pending",
    acceptance_criteria: ["The fixture is valid."],
    ...overrides,
  };
}

async function createFixture(options: {
  features: FixtureFeature[];
  files?: Record<string, string>;
}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "harness-state-"));
  await writeFile(join(root, "feature_list.json"), JSON.stringify(options.features));
  for (const [relativePath, contents] of Object.entries(options.files ?? {})) {
    const path = join(root, relativePath);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, contents);
  }
  return root;
}

function codes(findings: Awaited<ReturnType<typeof validateHarnessState>>): string[] {
  return findings.map(({ code }) => code).sort();
}

function runValidator(root: string): Promise<{ exitCode: number; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(TSX_BINARY, [join(REPOSITORY_ROOT, "scripts/check-harness-state.ts"), root]);
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolveResult({ exitCode: exitCode ?? -1, stderr });
    });
  });
}
