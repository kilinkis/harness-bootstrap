import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { readGitChangedPaths } from "./git-changed-paths.js";

export type LocalGate = "documentation" | "feedback";

export interface LocalVerificationSelection {
  gate: LocalGate;
  command: "verify:docs" | "feedback";
  changedPaths: string[];
  reason: string;
}

interface Options {
  base: string;
  dryRun: boolean;
  root: string;
}

const ROOT_DOCUMENTATION = new Set(["README.md"]);

export function selectLocalVerification(
  changedPaths: string[],
): LocalVerificationSelection {
  const normalized = normalizePaths(changedPaths);
  const refused = normalized.filter((path) => !isApprovedDocumentation(path));
  if (normalized.length === 0) {
    return {
      gate: "feedback",
      command: "feedback",
      changedPaths: [],
      reason: "No changed files were found; the reduced gate requires an explicit documentation change.",
    };
  }
  if (refused.length > 0) {
    return {
      gate: "feedback",
      command: "feedback",
      changedPaths: normalized,
      reason: `The reduced gate was refused because these paths are not approved documentation: ${refused.join(", ")}.`,
    };
  }
  return {
    gate: "documentation",
    command: "verify:docs",
    changedPaths: normalized,
    reason: "All changed files are approved documentation paths.",
  };
}

export async function readLocalChangedPaths(
  root: string,
  base: string,
): Promise<string[]> {
  return normalizePaths(await readGitChangedPaths(root, base));
}

function isApprovedDocumentation(path: string): boolean {
  return ROOT_DOCUMENTATION.has(path) ||
    (path.startsWith("docs/") && path.endsWith(".md"));
}

function normalizePaths(paths: string[]): string[] {
  return [...new Set(paths.map((path) => path.replaceAll("\\", "/").replace(/^\.\//, "")))]
    .filter(Boolean)
    .sort();
}

function parseOptions(args: string[]): Options {
  let base = "origin/main";
  let dryRun = false;
  const paths: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") continue;
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--base") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) throw usageError();
      base = value;
      index += 1;
    } else if (arg?.startsWith("-")) throw usageError();
    else if (arg) paths.push(arg);
  }
  if (paths.length > 1) throw usageError();
  return { base, dryRun, root: resolve(paths[0] ?? ".") };
}

async function runCommand(root: string, command: string): Promise<void> {
  await new Promise<void>((resolveRun, reject) => {
    const child = execFile("pnpm", ["run", command], { cwd: root }, (error) => {
      if (error) reject(new Error(`Local ${command} gate failed`, { cause: error }));
      else resolveRun();
    });
    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);
  });
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const changedPaths = await readLocalChangedPaths(options.root, options.base);
  const selection = selectLocalVerification(changedPaths);
  console.log(`Local verification base: ${options.base}`);
  console.log(`Selected gate: ${selection.gate}`);
  console.log(`Reason: ${selection.reason}`);
  console.log(`Changed paths: ${selection.changedPaths.length}`);
  if (!options.dryRun) await runCommand(options.root, selection.command);
}

function usageError(): Error {
  return new Error("Usage: local-verification [--base ref] [--dry-run] [repository-root]");
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Local verification failed");
    process.exitCode = 1;
  }
}
