import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { computeImplementationDigest, validateReviewBinding } from "../../scripts/review-binding.js";

export async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "review-binding-"));
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "progress"), { recursive: true });
  await mkdir(join(root, ".github/workflows"), { recursive: true });
  await writeFeatureQueue(root, "in_review");
  await writeFile(join(root, "src/value.ts"), "export const value = 1;\n");
  await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await writeFile(join(root, "package.json"), JSON.stringify({
    name: "fixture",
    scripts: { test: "node --test" },
    devDependencies: { typescript: "^5.9.0" },
  }));
  await writeFile(join(root, ".github/workflows/verify.yml"), [
    "jobs:",
    "  verify:",
    "    steps:",
    "      - uses: pnpm/action-setup@v6",
    "        with:",
    "          version: 10.34.5",
  ].join("\n"));
  await writeFile(join(root, "progress/current.md"), "TASK-100 is in review.\n");
  await runGit(root, ["init", "--quiet"]);
  await runGit(root, ["config", "user.email", "fixture@example.test"]);
  await runGit(root, ["config", "user.name", "Fixture"]);
  await runGit(root, ["add", "."]);
  await runGit(root, ["commit", "--quiet", "-m", "Initial fixture"]);
  await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
  return root;
}

export async function addReviewReport(root: string): Promise<string> {
  const digest = await computeImplementationDigest(root);
  await writeFile(
    join(root, "progress/review_TASK-100.md"),
    `# Review\n\nImplementation digest: ${digest}\n`,
  );
  await runGit(root, ["add", "progress/review_TASK-100.md"]);
  return digest;
}

export async function writeFeatureQueue(root: string, status: string): Promise<void> {
  await writeFile(join(root, "feature_list.json"), JSON.stringify([{
    id: "TASK-100",
    title: "Fixture",
    status,
    issue: "https://example.test/100",
    acceptance_criteria: ["The fixture works."],
  }]));
}

export async function finalizeFeature(root: string): Promise<void> {
  await writeFeatureQueue(root, "done");
  await writeFile(join(root, "progress/current.md"), "No feature is active.\n");
  await runGit(root, ["add", "feature_list.json", "progress"]);
  await runGit(root, ["commit", "--quiet", "-m", "Complete feature"]);
  await runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
}

export function runGit(root: string, args: string[]): Promise<void> {
  return new Promise((resolveRun, reject) => {
    execFile("git", args, { cwd: root }, (error) => {
      if (error) reject(new Error(error.message));
      else resolveRun();
    });
  });
}

export function codes(
  findings: Awaited<ReturnType<typeof validateReviewBinding>>,
): string[] {
  return findings.map(({ code }) => code);
}
