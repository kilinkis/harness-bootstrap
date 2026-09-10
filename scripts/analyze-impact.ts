import { resolve } from "node:path";

import { resolveComparisonBase } from "./comparison-base.js";
import { readGitChangedPaths } from "./git-changed-paths.js";
import {
  analyzeImpact,
  type ImpactAnalysisResult,
} from "./impact-analysis.js";

interface Options {
  base: string | undefined;
  json: boolean;
  root: string;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const base = await resolveComparisonBase(options.root, options.base);
  const changedPaths = await readGitChangedPaths(options.root, base.commit);
  const result = await analyzeImpact(options.root, changedPaths);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else printReport(result, `${base.ref} (${base.commit ?? "full analysis"})`);
}

function parseOptions(args: string[]): Options {
  let base: string | undefined;
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
