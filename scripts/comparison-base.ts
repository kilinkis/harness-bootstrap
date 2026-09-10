import { execFile } from "node:child_process";

export interface ComparisonBase {
  ref: string;
  commit: string | null;
}

export async function resolveComparisonBase(root: string, requested?: string): Promise<ComparisonBase> {
  const ref = requested ?? process.env.HARNESS_BASE_REF ?? "origin/main";
  if (/^(?:0{40}|0{64})$/.test(ref)) return { ref, commit: null };
  try {
    if (!ref.trim() || ref.startsWith("-")) throw new Error("Invalid ref");
    const target = await git(root, ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`]);
    const commit = await git(root, ["merge-base", "HEAD", target]);
    return { ref, commit };
  } catch {
    throw new Error(`COMPARISON_BASE_INVALID: cannot resolve ${ref} against HEAD; fetch full history or set HARNESS_BASE_REF to the intended target`);
  }
}

function git(root: string, args: string[]): Promise<string> {
  return new Promise((resolveOutput, reject) => {
    execFile("git", args, { cwd: root, encoding: "utf8" }, (error, stdout) => {
      if (error) reject(new Error(error.message));
      else resolveOutput(stdout.trim());
    });
  });
}
