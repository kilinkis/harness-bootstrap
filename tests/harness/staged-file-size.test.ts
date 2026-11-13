import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const checker = resolve("scripts/check-staged-file-size.ts");
const hook = resolve(".githooks/pre-commit");
const defaults = readFileSync(".gitattributes");

void test("pre-commit checks staged bytes and provides actionable split instructions", () => {
  const root = mkdtempSync(join(tmpdir(), "staged-size-"));
  const git = (...args: string[]): string => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const write = (path: string, content: string | Buffer): void => writeFileSync(join(root, path), content);
  const check = () => spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
  try {
    git("init", "-q");
    git("config", "user.name", "Test");
    git("config", "user.email", "test@example.com");
    write("boundary.txt", "a".repeat(20_000));
    git("add", ".");
    assert.equal(check().status, 0, "unborn HEAD and exact boundary pass");
    git("commit", "-qm", "Baseline");
    write("boundary.txt", "a".repeat(20_001));
    assert.equal(check().status, 0, "unstaged oversized content is ignored");
    git("add", ".");
    write("boundary.txt", "small");
    const failed = check();
    assert.equal(failed.status, 1, "working-tree reduction does not hide staged size");
    assert.match(failed.stderr, /20001 bytes = 5000.25 tokens/);
    for (const instruction of ["extract cohesive", "test groups", "split by topic", "Update imports", "git add"]) {
      assert.ok(failed.stderr.includes(instruction));
    }
    write("odd\nname ü.txt", "é".repeat(10_001));
    write("-leading.txt", "a".repeat(20_001));
    git("add", ".");
    assert.match(check().stderr, /20002 bytes = 5000.5 tokens/);
    assert.ok(check().stderr.includes('"odd\\nname ü.txt"'));
    assert.ok(check().stderr.includes('"-leading.txt"'));
    write(".gitattributes", '*.txt linguist-generated=true\n');
    assert.equal(check().status, 1, "unstaged attributes cannot bypass the limit");
    git("add", ".gitattributes");
    assert.equal(check().status, 0);
    git("commit", "-qm", "Generated fixture");
    git("mv", "--", "-leading.txt", "renamed.txt");
    write(".gitattributes", "");
    git("add", ".gitattributes");
    assert.match(check().stderr, /renamed.txt/, "rename destination is checked");
    git("rm", "-f", "--", "renamed.txt", "odd\nname ü.txt");
    assert.equal(check().status, 0, "deletions and unchanged oversized blobs are skipped");
    write(".gitattributes", defaults);
    for (const path of ["pnpm-lock.yaml", "client.generated.ts", "client.gen.ts"]) {
      write(path, "x".repeat(20_001));
    }
    mkdirSync(join(root, "__generated__"));
    write("__generated__/api.ts", "x".repeat(20_001));
    git("add", ".");
    assert.equal(check().status, 0, "default generated exclusions pass");
    write(".gitattributes", `${defaults.toString()}third-party.txt linguist-vendored=true\n`);
    write("third-party.txt", "x".repeat(20_001));
    git("add", ".");
    assert.equal(check().status, 0, "vendored content is excluded");
    const commit = git("rev-parse", "HEAD").trim();
    git("update-index", "--add", "--cacheinfo", `160000,${commit},submodule`);
    assert.equal(check().status, 0, "submodule commit sizes are not inspected");
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, ".githooks"));
    copyFileSync(checker, join(root, "scripts/check-staged-file-size.ts"));
    copyFileSync(hook, join(root, ".githooks/pre-commit"));
    chmodSync(join(root, ".githooks/pre-commit"), 0o755);
    git("config", "core.hooksPath", ".githooks");
    write("authored.ts", "x".repeat(20_001));
    git("add", "authored.ts");
    const rejected = spawnSync("git", ["commit", "-qm", "Must fail"], { cwd: root, encoding: "utf8" });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /Commit blocked/);
    write("authored.ts", "small");
    git("add", "authored.ts");
    git("commit", "-qm", "Hook accepts repaired file");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

void test("checker fails closed outside a Git repository", () => {
  const root = mkdtempSync(join(tmpdir(), "no-index-"));
  try {
    const result = spawnSync(process.execPath, [checker], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Staged file size check failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
