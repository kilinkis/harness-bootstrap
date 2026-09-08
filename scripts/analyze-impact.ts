import { execFile } from "node:child_process";
import { resolve } from "node:path";

import {
  analyzeImpact,
  type ImpactAnalysisResult,
} from "./impact-analysis.js";

interface Options {
  base: string;
  json: boolean;
  root: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const changedPaths = await readChangedPaths(options.root, options.base);
  const result = await analyzeImpact(options.root, changedPaths);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printReport(result, options.base);
}

function parseOptions(args: string[]): Options {
  let base = "origin/main";
  let json = false;
  const paths: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") json = true;
    else if (arg === "--base") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) throw usageError();
      base = value;
      index += 1;
    } else if (arg?.startsWith("-")) throw usageError();
    else if (arg) paths.push(arg);
  }
  if (paths.length > 1) throw usageError();
  return { base, json, root: resolve(paths[0] ?? ".") };
}

async function readChangedPaths(root: string, base: string): Promise<string[]> {
  const [diffPaths, untrackedPaths] = await Promise.all([
    readGitPaths(
      root,
      ["diff", "--no-renames", "--name-only", "-z", base, "--"],
      base,
    ),
    readGitPaths(root, ["ls-files", "--others", "--exclude-standard", "-z"], base),
  ]);
  return [...new Set([...diffPaths, ...untrackedPaths])].sort();
}

function readGitPaths(
  root: string,
  args: string[],
  base: string,
): Promise<string[]> {
  return new Promise((resolvePaths, reject) => {
    execFile(
      "git",
      args,
      { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(new Error(`Cannot read changes from Git base ${base}: ${error.message}`));
          return;
        }
        resolvePaths(stdout.split("\0").filter(Boolean));
      },
    );
  });
}

function printReport(result: ImpactAnalysisResult, base: string): void {
  console.log(`Impact analysis against ${base}`);
  console.log(`Changed paths: ${result.changedPaths.length}`);
  console.log("\nAffected targets:");
  if (result.affectedTargets.length === 0) console.log("- none identified");
  for (const target of result.affectedTargets) {
    console.log(`- ${target.path}`);
    for (const reason of target.reasons) console.log(`  reason: ${reason}`);
    for (const command of target.commands) {
      console.log(`  ${command.kind}: ${command.command}`);
    }
  }
  console.log("\nUncertainties:");
  if (result.uncertainties.length === 0) console.log("- none");
  for (const uncertainty of result.uncertainties) console.log(`- ${uncertainty}`);
  console.log("\nFull merge gate remains required: yes");
}

function usageError(): Error {
  return new Error("Usage: analyze-impact [--json] [--base ref] [repository-root]");
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Impact analysis failed");
  process.exitCode = 1;
}
