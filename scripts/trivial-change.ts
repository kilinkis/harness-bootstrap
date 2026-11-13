import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { resolveComparisonBase } from "./comparison-base.js";

export interface ChangeSize {
  path: string;
  added: number;
  deleted: number;
}

export const TRIVIAL_MAX_FILES = 3;
export const TRIVIAL_MAX_LINES = 30;

// Paths that define work items, evidence, the gate itself, or its dependencies.
// Dotfiles and root JSON or YAML files are configuration (hooks, CI, Renovate,
// package manager). The project's riskyReview.paths are added at runtime.
const CONTROL_PATTERNS = [
  "feature_list.json",
  "progress/**",
  "tests/harness/**",
  "scripts/**",
  ".*",
  "**/.*",
  "*.json",
  "*.yaml",
  "*.yml",
  "**/pnpm-workspace.yaml",
  "*.config.*",
  "**/*.config.*",
  "**/tsconfig*.json",
  "**/package.json",
];

export function classifyTrivialChange(changes: ChangeSize[], riskyPaths: string[]): string[] {
  const reasons: string[] = [];
  const blocked = [...CONTROL_PATTERNS, ...riskyPaths].map(globToRegExp);
  if (changes.length === 0) reasons.push("No changed files.");
  if (changes.length > TRIVIAL_MAX_FILES) reasons.push(`Changes ${changes.length} files; the limit is ${TRIVIAL_MAX_FILES}.`);
  for (const { path, added, deleted } of changes) {
    if (blocked.some((pattern) => pattern.test(path))) reasons.push(`Path requires a work item: ${JSON.stringify(path)}.`);
    if (![added, deleted].every((value) => Number.isSafeInteger(value) && value >= 0)) {
      reasons.push(`Binary or invalid line counts: ${JSON.stringify(path)}.`);
    }
  }
  const lines = changes.reduce((total, { added, deleted }) => total + added + deleted, 0);
  if (lines > TRIVIAL_MAX_LINES) reasons.push(`Changes ${lines} lines; the limit is ${TRIVIAL_MAX_LINES}.`);
  return reasons;
}

export async function readRiskyPaths(root: string): Promise<string[] | undefined> {
  try {
    const policy = JSON.parse(await readFile(join(root, "harness.models.json"), "utf8")) as unknown;
    const paths = (policy as { riskyReview?: { paths?: unknown } }).riskyReview?.paths;
    return Array.isArray(paths) && paths.length > 0 && paths.every((path) => typeof path === "string" && path)
      ? paths as string[] : undefined;
  } catch {
    return undefined;
  }
}

export async function readStagedChanges(root: string, base: string): Promise<ChangeSize[]> {
  return parseNumstat(await git(root, ["diff", "--cached", "--no-renames", "--numstat", "-z", base, "--"]));
}

// Compares base with head, or with the index when head is empty. Returns the
// line counts and a reason for each symlink, submodule, or mode-only change.
export async function readStep(root: string, base: string, head: string): Promise<{ changes: ChangeSize[]; modeReasons: string[] }> {
  const range = head ? [base, head] : ["--cached", base];
  const [numstat, raw] = await Promise.all([
    git(root, ["diff", "--no-renames", "--numstat", "-z", ...range, "--"]),
    git(root, ["diff", "--no-renames", "--raw", "-z", ...range, "--"]),
  ]);
  const fields = raw.split("\0");
  const modeReasons: string[] = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    const [oldMode, newMode] = (fields[index] ?? "").slice(1).split(" ");
    const path = fields[index + 1] ?? "";
    const regular = (mode?: string) => mode === "000000" || mode === "100644" || mode === "100755";
    if (!regular(oldMode) || !regular(newMode) || (oldMode !== "000000" && newMode !== "000000" && oldMode !== newMode)) {
      modeReasons.push(`Mode change, symlink, or submodule requires a work item: ${JSON.stringify(path)}.`);
    }
  }
  return { changes: parseNumstat(numstat), modeReasons };
}

function parseNumstat(output: string): ChangeSize[] {
  return output.split("\0").filter(Boolean).map((record) => {
    const first = record.indexOf("\t");
    const second = record.indexOf("\t", first + 1);
    return { path: record.slice(second + 1), added: Number(record.slice(0, first)), deleted: Number(record.slice(first + 1, second)) };
  });
}

export async function inspectTrivialChange(root: string, requestedBase?: string): Promise<string[]> {
  const riskyPaths = await readRiskyPaths(root);
  if (!riskyPaths) return ["harness.models.json has no riskyReview.paths; the trivial lane is unavailable."];
  const base = await resolveComparisonBase(root, requestedBase);
  if (!base.commit) return ["A first push or missing comparison commit requires a work item."];
  const { changes, modeReasons } = await readStep(root, base.commit, "");
  return [...classifyTrivialChange(changes, riskyPaths), ...modeReasons];
}

export async function findNonRegularEntries(root: string, changes: ChangeSize[], requirement: string): Promise<string[]> {
  const modes = await git(root, ["ls-files", "--stage", "-z"]);
  return modes.split("\0").filter(Boolean).flatMap((record) => {
    const path = record.slice(record.indexOf("\t") + 1);
    return changes.some((change) => change.path === path) && !/^100(?:644|755) /.test(record)
      ? [`Non-regular index entry requires ${requirement}: ${JSON.stringify(path)}.`] : [];
  });
}

function globToRegExp(pattern: string): RegExp {
  const source = pattern.split("**").map((part) =>
    part.split("*").map((text) => text.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*"),
  ).join(".*");
  // A pattern without a trailing wildcard also covers everything under it.
  return new RegExp(`^${source}(?:/.*)?$`);
}

function git(root: string, args: string[]): Promise<string> {
  return new Promise((resolveOutput, reject) => {
    execFile("git", args, { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(new Error(`Cannot read the Git snapshot: ${error.message}`));
      else resolveOutput(stdout);
    });
  });
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  try {
    if (process.argv.length > 2) throw new Error("Usage: pnpm run check:trivial-change (set HARNESS_BASE_REF for the actual PR target)");
    const reasons = await inspectTrivialChange(resolve("."));
    if (reasons.length > 0) throw new Error(`Trivial lane refused:\n${reasons.join("\n")}`);
    console.log("Trivial lane eligible. Record the lane and evidence in the PR body. Full CI remains required.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Trivial classification failed");
    process.exitCode = 1;
  }
}
