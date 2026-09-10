import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const LOCKFILE = "pnpm-lock.yaml";
const MANIFEST = "package.json";
const VERIFY_WORKFLOW = ".github/workflows/verify.yml";
const ALLOWED_PATHS = new Set([LOCKFILE, MANIFEST, VERIFY_WORKFLOW]);
const MANIFEST_KEYS = new Set([
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "packageManager",
]);

export async function classifyDependencyMaintenance(
  root: string,
  base: string,
  changedPaths: string[],
): Promise<boolean> {
  const paths = [...new Set(changedPaths.map(normalizePath))].filter(Boolean).sort();
  if (paths.length === 0 || paths.some((path) => !ALLOWED_PATHS.has(path))) return false;

  return Promise.all(paths.map((path) => isAllowedChange(root, base, path)))
    .then((results) => results.every(Boolean))
    .catch(() => false);
}

async function isAllowedChange(root: string, base: string, path: string): Promise<boolean> {
  if (path === LOCKFILE) return true;
  const [before, after] = await Promise.all([
    readRevisionFile(root, base, path),
    readFile(resolve(root, path), "utf8"),
  ]);
  if (before === undefined) return false;
  return path === MANIFEST
    ? isDependencyManifestChange(before, after)
    : isPnpmSetupVersionChange(before, after);
}

function isDependencyManifestChange(before: string, after: string): boolean {
  const beforeManifest = parseRecord(before);
  const afterManifest = parseRecord(after);
  if (!beforeManifest || !afterManifest) return false;
  return JSON.stringify(withoutDependencyFields(beforeManifest)) ===
    JSON.stringify(withoutDependencyFields(afterManifest));
}

function isPnpmSetupVersionChange(before: string, after: string): boolean {
  return normalizePnpmSetupVersion(before) === normalizePnpmSetupVersion(after);
}

function normalizePnpmSetupVersion(content: string): string {
  return content.replace(
    /(uses:\s*pnpm\/action-setup@[^\n]+\n\s+with:\n\s+version:)\s*[^\n]*/g,
    "$1 <pnpm-version>",
  );
}

function withoutDependencyFields(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !MANIFEST_KEYS.has(key)),
  );
}

function parseRecord(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function readRevisionFile(root: string, base: string, path: string): Promise<string | undefined> {
  return new Promise((resolveRevision) => {
    execFile("git", ["show", `${base}:${path}`], { cwd: root, encoding: "utf8" },
      (error, stdout) => resolveRevision(error ? undefined : stdout));
  });
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
