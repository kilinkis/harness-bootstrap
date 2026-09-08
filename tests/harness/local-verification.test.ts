import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  readLocalChangedPaths,
  selectLocalVerification,
} from "../../scripts/local-verification.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TSX_BINARY = join(
  REPOSITORY_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

void test("documentation-only paths select the reduced gate", () => {
  assert.deepEqual(selectLocalVerification(["docs/task-cli.md"]), {
    gate: "documentation",
    command: "verify:docs",
    changedPaths: ["docs/task-cli.md"],
    reason: "All changed files are approved documentation paths.",
  });
});

void test("root, process, source, configuration, and unknown paths refuse reduction", () => {
  for (const path of [
    "README.md",
    "AGENTS.md",
    "docs/review-binding.md",
    "docs/run-a-ticket.md",
    "docs/verification.md",
    "docs/note.md",
    "src/tasks.ts",
    "tests/tasks.test.ts",
    "package.json",
    "feature_list.json",
    "progress/current.md",
    "scripts/verify.sh",
    "notes.md",
  ]) {
    const selection = selectLocalVerification(["docs/task-cli.md", path]);
    assert.equal(selection.gate, "feedback", path);
    assert.equal(selection.command, "feedback", path);
    assert.match(selection.reason, /reduced gate was refused/i, path);
    assert.match(selection.reason, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), path);
  }
});

void test("no changes use the normal feedback gate", () => {
  const selection = selectLocalVerification([]);
  assert.equal(selection.gate, "feedback");
  assert.match(selection.reason, /No changed files/);
});

void test("the command reads an explicit Git base and reports its selection", async () => {
  const root = await createGitFixture();
  try {
    await writeFixture(root, "docs/task-cli.md", "# Tasks\n");
    assert.deepEqual(await readLocalChangedPaths(root, "HEAD"), ["docs/task-cli.md"]);

    const result = await runSelector(root, "HEAD");
    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /Local verification base: HEAD/);
    assert.match(result.stdout, /Selected gate: documentation/);
    assert.match(result.stdout, /All changed files are approved documentation paths/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the command defaults to origin/main", async () => {
  const root = await createGitFixture();
  try {
    await git(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    await writeFixture(root, "docs/task-cli.md", "# Tasks\n");

    const result = await runSelector(root);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /Local verification base: origin\/main/);
    assert.match(result.stdout, /Selected gate: documentation/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("Git classification refuses a staged non-documentation change", async () => {
  const root = await createGitFixture();
  try {
    await writeFixture(root, "scripts/change.ts", "export const changed = true;\n");
    await git(root, ["add", "scripts/change.ts"]);

    const result = await runSelector(root, "HEAD");
    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /Selected gate: feedback/);
    assert.match(result.stdout, /reduced gate was refused/i);
    assert.match(result.stdout, /scripts\/change\.ts/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function createGitFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "local-verification-"));
  await git(root, ["init", "--quiet"]);
  await git(root, ["config", "user.email", "fixture@example.test"]);
  await git(root, ["config", "user.name", "Fixture"]);
  await writeFixture(root, "README.md", "# Fixture\n");
  await git(root, ["add", "README.md"]);
  await git(root, ["commit", "--quiet", "-m", "Initial fixture"]);
  return root;
}

async function writeFixture(root: string, path: string, contents: string): Promise<void> {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

function git(root: string, args: string[]): Promise<void> {
  return new Promise((resolveCommand, reject) => {
    execFile("git", args, { cwd: root }, (error) => {
      if (error) reject(new Error("Git fixture command failed", { cause: error }));
      else resolveCommand();
    });
  });
}

function runSelector(
  root: string,
  base?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const args = [join(REPOSITORY_ROOT, "scripts/local-verification.ts"), "--"];
    if (base) args.push("--base", base);
    args.push("--dry-run", root);
    const child = execFile(
      TSX_BINARY,
      args,
      { encoding: "utf8" },
      (error, stdout, stderr) => {
        const exitCode = error && "code" in error && typeof error.code === "number"
          ? error.code
          : 0;
        resolveResult({ exitCode, stdout, stderr });
      },
    );
    child.on("error", reject);
  });
}
