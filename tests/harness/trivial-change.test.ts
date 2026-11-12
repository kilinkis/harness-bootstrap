import assert from "node:assert/strict";
import { chmod, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";

import { validateReviewBinding } from "../../scripts/review-binding.js";
import { classifyTrivialChange, inspectTrivialChange } from "../../scripts/trivial-change.js";
import { addReviewReport, codes, createFixture, finalizeFeature, runGit } from "./review-binding-fixture.js";

const RISKY = ["scripts/**", "src/auth/**"];
const change = (path: string, added = 1, deleted = 0) => ({ path, added, deleted });

void test("trivial classification accepts small changes outside control and risky paths", () => {
  assert.deepEqual(classifyTrivialChange([change("src/a.ts", 10, 5), change("README.md", 10, 5)], RISKY), []);
  assert.deepEqual(classifyTrivialChange([change("docs/guide.md", 30, 0)], RISKY), []);
});

void test("trivial classification refuses size, control, risky, and binary changes", () => {
  const refused = (changes: ReturnType<typeof change>[]) => classifyTrivialChange(changes, RISKY).length > 0;
  assert.ok(refused([]), "empty");
  assert.ok(refused([change("a.md"), change("b.md"), change("c.md"), change("d.md")]), "four files");
  assert.ok(refused([change("src/a.ts", 20, 11)]), "31 lines");
  for (const path of ["feature_list.json", "progress/current.md", "tests/harness/x.test.ts", "scripts/x.ts",
    ".github/workflows/verify.yml", "package.json", "apps/web/package.json", "pnpm-lock.yaml",
    "harness.models.json", "tsconfig.json", "eslint.config.js", "apps/web/vite.config.ts", "src/auth/session.ts",
    ".githooks/pre-commit", "renovate.json", ".npmrc", "pnpm-workspace.yaml", ".gitattributes", ".fallowrc.json",
    "apps/web/.env.example"]) {
    assert.ok(refused([change(path)]), path);
  }
  assert.ok(classifyTrivialChange([change("src/auth/login.ts")], ["src/auth"]).length > 0, "pattern without wildcard");
  assert.ok(refused([change("logo.png", Number.NaN, Number.NaN)]), "binary");
});

void test("review binding accepts trivial merges one step at a time", async () => {
  const root = await createPolicyFixture();
  try {
    await stageLines(root, "src/value.ts", 20);
    assert.deepEqual(await validateReviewBinding(root), [], "staged trivial change");
    await mergeToMain(root);
    await stageLines(root, "src/other.ts", 20);
    assert.deepEqual(await validateReviewBinding(root), [], "second trivial change after the first merged");
    await mergeToMain(root);
    assert.deepEqual(await validateReviewBinding(root), [], "default branch after both merges");
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\nupdated: true\n");
    await runGit(root, ["add", "pnpm-lock.yaml"]);
    assert.deepEqual(await validateReviewBinding(root), [], "dependency maintenance after trivial merges");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("review binding refuses non-trivial changes without a work item", async () => {
  for (const [path, lines] of [["src/value.ts", 31], ["scripts/check.ts", 1], ["progress/current.md", 1]] as const) {
    const root = await createPolicyFixture();
    try {
      await stageLines(root, path, lines);
      if (path === "progress/current.md") await stageLines(root, "src/value.ts", 1);
      assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"], path);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

void test("review binding refuses symlinks, submodules, and mode-only changes", async () => {
  for (const kind of ["symlink", "submodule", "mode"] as const) {
    const root = await createPolicyFixture();
    try {
      if (kind === "symlink") {
        await symlink("../scripts/verify.sh", join(root, "src/link.ts"));
        await runGit(root, ["add", "src/link.ts"]);
      } else if (kind === "submodule") {
        await runGit(root, ["update-index", "--add", "--cacheinfo", `160000,${"a".repeat(40)},src/sub`]);
      } else {
        await chmod(join(root, "src/value.ts"), 0o755);
        await runGit(root, ["add", "src/value.ts"]);
      }
      assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"], kind);
      assert.match((await inspectTrivialChange(root, "origin/main")).join("\n"), /Mode change, symlink, or submodule/, kind);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

void test("local commits after the comparison base count as one step", async () => {
  const root = await createPolicyFixture();
  try {
    await stageLines(root, "src/value.ts", 20);
    await runGit(root, ["commit", "--quiet", "-m", "First local commit"]);
    await stageLines(root, "src/other.ts", 20);
    await runGit(root, ["commit", "--quiet", "-m", "Second local commit"]);
    assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("review binding refuses the trivial lane without a risk policy", async () => {
  const root = await createFixture();
  try {
    await addReviewReport(root);
    await finalizeFeature(root);
    await stageLines(root, "src/value.ts", 2);
    assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a direct unreviewed step stays stale after later trivial merges", async () => {
  const root = await createPolicyFixture();
  try {
    await stageLines(root, "src/value.ts", 40);
    await mergeToMain(root);
    await stageLines(root, "src/other.ts", 1);
    await mergeToMain(root);
    assert.deepEqual(codes(await validateReviewBinding(root)), ["REVIEW_BINDING_STALE"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the eligibility command judges the staged change against the comparison base", async () => {
  const root = await createPolicyFixture();
  const unconfigured = await createFixture();
  try {
    await stageLines(root, "src/value.ts", 5);
    assert.deepEqual(await inspectTrivialChange(root, "origin/main"), []);
    await stageLines(root, "src/value.ts", 31);
    assert.match((await inspectTrivialChange(root, "origin/main")).join("\n"), /32 lines/);
    await stageLines(unconfigured, "src/value.ts", 1);
    assert.match((await inspectTrivialChange(unconfigured, "origin/main")).join("\n"), /trivial lane is unavailable/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(unconfigured, { recursive: true, force: true });
  }
});

async function createPolicyFixture(): Promise<string> {
  const root = await createFixture();
  await writeFile(join(root, "harness.models.json"), JSON.stringify({ riskyReview: { paths: ["scripts/**"] } }));
  await runGit(root, ["add", "harness.models.json"]);
  await addReviewReport(root);
  await finalizeFeature(root);
  return root;
}

async function stageLines(root: string, path: string, lines: number): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), Array.from({ length: lines }, (_, index) => `// line ${index}`).join("\n") + "\n");
  await runGit(root, ["add", path]);
}

async function mergeToMain(root: string): Promise<void> {
  await runGit(root, ["commit", "--quiet", "-m", "Merge change"]);
  await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
}
