import { execFileSync } from "node:child_process";

const limitBytes = 20_000;

function git(args: string[], input?: string): string {
  return execFileSync("git", args, { encoding: "utf8", input, maxBuffer: 32 * 1024 * 1024 });
}

try {
  const records = git([
    "diff", "--cached", "--raw", "--no-abbrev", "--no-renames", "-z",
    "--diff-filter=ACMTU", "--",
  ]).split("\0");
  const oversized: string[] = [];
  for (let index = 0; index < records.length - 1; index += 2) {
    const [, mode, , object, status] = records[index].split(" ");
    const path = records[index + 1];
    if (status === "U") throw new Error(`Resolve the staged conflict in ${JSON.stringify(path)}.`);
    if (mode === "160000") continue;
    const attributes = git([
      "check-attr", "--cached", "-z", "--stdin", "linguist-generated", "linguist-vendored",
    ], `${path}\0`).split("\0");
    if (attributes[2] === "true" || attributes[2] === "set"
      || attributes[5] === "true" || attributes[5] === "set") continue;
    const bytes = Number(git(["cat-file", "-s", object]).trim());
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error("Invalid Git blob size.");
    if (bytes > limitBytes) oversized.push(`  ${JSON.stringify(path)}: ${bytes} bytes = ${bytes / 4} tokens`);
  }
  if (oversized.length > 0) {
    console.error([
      "Commit blocked: staged authored files exceed 5,000 tokens (20,000 bytes; tokens = bytes / 4).",
      ...oversized,
      "Split each file so every resulting file is at most 20,000 bytes:",
      "1. Code: extract cohesive responsibilities into named modules; keep a small entry point.",
      "2. Tests: move related test groups and fixtures into separate files by behavior.",
      "3. Docs/data: split by topic or logical records; add an index and update links or loaders.",
      "4. Update imports/references, run relevant checks, then git add the changed and new files and retry.",
      "Only genuinely generated or vendored files should be marked in .gitattributes (see docs/pre-commit.md).",
    ].join("\n"));
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Staged file size check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
