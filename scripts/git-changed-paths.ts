import { execFile } from "node:child_process";

export async function readGitChangedPaths(
  root: string,
  base: string | null,
): Promise<string[]> {
  const [tracked, untracked] = await Promise.all([
    readGitPaths(
      root,
      base === null ? ["ls-files", "--cached", "-z"]
        : ["diff", "--no-renames", "--name-only", "-z", base, "--"],
      base,
    ),
    readGitPaths(root, ["ls-files", "--others", "--exclude-standard", "-z"], base),
  ]);
  return [...new Set([...tracked, ...untracked])].sort();
}

function readGitPaths(
  root: string,
  args: string[],
  base: string | null,
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
