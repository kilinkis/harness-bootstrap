import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { classifySmallChange, inspectSmallChange } from "../../scripts/small-change.js";

void test("small-code classification enforces boundaries and excludes only evidence", () => {
  const change = (path: string, added = 1, deleted = 0) => ({ path, added, deleted });
  assert.deepEqual(classifySmallChange([change("src/tasks.ts", 100, 50), change("feature_list.json", 900), change("progress/current.md", 900)]), []);
  assert.notDeepEqual(classifySmallChange([change("src/tasks.ts", 100, 51)]), []);
  assert.deepEqual(classifySmallChange(Array.from({ length: 5 }, (_, i) => change(`src/file${i}.ts`))), []);
  assert.notDeepEqual(classifySmallChange(Array.from({ length: 6 }, (_, i) => change(`src/file${i}.ts`))), []);
  for (const path of ["scripts/check-staged-file-size.ts", "tests/harness/check.test.ts", "package.json", "AGENTS.md", ".github/workflows/verify.yml", "src/../scripts/gate.ts", "src/odd\nfile.ts"]) {
    assert.notDeepEqual(classifySmallChange([change("src/tasks.ts"), change(path)]), [], path);
  }
  assert.notDeepEqual(classifySmallChange([]), []);
  assert.notDeepEqual(classifySmallChange([change("progress/current.md")]), []);
  assert.notDeepEqual(classifySmallChange([change("docs/task-cli.md")]), []);
  for (const size of [NaN, -1, Infinity, 0.5]) {
    assert.notDeepEqual(classifySmallChange([change("src/tasks.ts", size)]), []);
  }
});

void test("Git classification includes committed branch scope, staged changes and snapshot safety", async () => {
  const root = mkdtempSync(join(tmpdir(), "small-change-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const write = (path: string, content: string | Buffer) => writeFileSync(join(root, path), content);
  try {
    git("init", "-q");
    git("config", "user.name", "Fixture");
    git("config", "user.email", "fixture@example.test");
    mkdirSync(join(root, "src"));
    write("src/a.ts", "export const a = 1;\n");
    git("add", ".");
    git("commit", "-qm", "Baseline");
    const base = git("rev-parse", "HEAD");
    write("src/a.ts", "export const a = 2;\n");
    await assert.rejects(inspectSmallChange(root, base), /snapshot|unstaged/i);
    git("add", ".");
    assert.deepEqual(await inspectSmallChange(root, base), []);
    git("commit", "-qm", "Product change");
    assert.deepEqual(await inspectSmallChange(root, base), [], "committed product changes stay in scope");
    write("src/b.ts", Buffer.from([0, 1, 2]));
    git("add", ".");
    assert.match((await inspectSmallChange(root, base)).join(" "), /Binary/);
    git("rm", "-f", "src/b.ts");
    symlinkSync("a.ts", join(root, "src/link.ts"));
    git("add", ".");
    assert.match((await inspectSmallChange(root, base)).join(" "), /Non-regular/);
    git("rm", "-f", "src/link.ts");
    write("package.json", "{}\n");
    git("add", ".");
    git("commit", "-qm", "Control change");
    assert.match((await inspectSmallChange(root, base)).join(" "), /package.json/);
    await assert.rejects(inspectSmallChange(root, "missing-ref"), /COMPARISON_BASE_INVALID/);
    assert.notDeepEqual(await inspectSmallChange(root, "0".repeat(40)), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

void test("small completion executes every guard in order and stops on any failure", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
  const root = mkdtempSync(join(tmpdir(), "small-gate-"));
  try {
    const stub = join(root, "pnpm");
    writeFileSync(stub, '#!/bin/sh\nprintf "%s\\n" "$2"\n[ "$2" != "$FAIL_STAGE" ]\n');
    chmodSync(stub, 0o755);
    const stages = ["check:small-change", "check:delivery", "check:harness-state", "check:review-binding"];
    for (const failed of ["", ...stages]) {
      const result = spawnSync("sh", ["-c", manifest.scripts["verify:small"]], {
        cwd: root, encoding: "utf8", env: { ...process.env, PATH: `${root}:${process.env.PATH ?? ""}`, FAIL_STAGE: failed },
      });
      assert.equal(result.status, failed ? 1 : 0);
      assert.deepEqual(result.stdout.trim().split("\n"), failed ? stages.slice(0, stages.indexOf(failed) + 1) : stages);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
