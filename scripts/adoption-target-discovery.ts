import { access, glob, readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { parseDocument } from "yaml";

import type {
  AdoptionFinding,
  AdoptionTarget,
  DetectedScript,
  PackageManifest,
} from "./adoption-audit-types.js";
import { addFinding } from "./adoption-findings.js";

const FRONTEND_PACKAGES = new Map<string, string>([
  ["next", "next"],
  ["react", "react"],
  ["vite", "vite"],
  ["vue", "vue"],
  ["nuxt", "nuxt"],
  ["svelte", "svelte"],
  ["@sveltejs/kit", "sveltekit"],
  ["astro", "astro"],
  ["@angular/core", "angular"],
  ["@remix-run/react", "remix"],
  ["solid-js", "solid"],
]);

export async function discoverTargets(
  root: string,
  findings: AdoptionFinding[],
): Promise<AdoptionTarget[]> {
  const packagePaths = await discoverPackagePaths(root, findings);
  const targets: AdoptionTarget[] = [];
  for (const packagePath of packagePaths) {
    const manifest = await readManifest(root, packagePath, findings);
    if (manifest) targets.push(await inspectTarget(root, packagePath, manifest));
  }
  return targets.sort((left, right) => left.path.localeCompare(right.path));
}

export async function readRootScripts(root: string): Promise<Record<string, string>> {
  try {
    const manifest = JSON.parse(
      await readFile(resolve(root, "package.json"), "utf8"),
    ) as PackageManifest;
    return stringRecord(manifest.scripts);
  } catch {
    return {};
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function discoverPackagePaths(
  root: string,
  findings: AdoptionFinding[],
): Promise<string[]> {
  const paths = new Set<string>();
  if (await fileExists(resolve(root, "package.json"))) paths.add("package.json");
  else addFinding(findings, "ROOT_PACKAGE_MISSING", "Cannot find package.json", "package.json");

  const workspacePath = resolve(root, "pnpm-workspace.yaml");
  if (!(await fileExists(workspacePath))) return [...paths];

  const patterns = parseWorkspacePatterns(
    await readFile(workspacePath, "utf8"),
    findings,
  );
  for (const pattern of patterns) {
    await addWorkspaceMatches(root, pattern, paths, findings);
  }
  return [...paths].sort();
}

async function addWorkspaceMatches(
  root: string,
  pattern: string,
  paths: Set<string>,
  findings: AdoptionFinding[],
): Promise<void> {
  if (isUnsafeWorkspacePattern(pattern)) {
    addFinding(
      findings,
      "WORKSPACE_PATTERN_UNSAFE",
      `Workspace pattern can leave the repository: ${pattern}`,
      "pnpm-workspace.yaml",
    );
    return;
  }
  if (pattern.startsWith("!")) {
    addFinding(
      findings,
      "WORKSPACE_PATTERN_UNSUPPORTED",
      `Review exclusion pattern manually: ${pattern}`,
      "pnpm-workspace.yaml",
    );
    return;
  }
  const matches: string[] = [];
  for await (const match of glob(`${trimSlash(pattern)}/package.json`, {
    cwd: root,
    exclude: ["**/node_modules/**", "**/.git/**"],
  })) {
    matches.push(toPosix(match));
  }
  if (matches.length === 0) {
    addFinding(
      findings,
      "WORKSPACE_PATTERN_UNRESOLVED",
      `Workspace pattern matched no packages: ${pattern}`,
      "pnpm-workspace.yaml",
    );
  }
  for (const match of matches) paths.add(match);
}

function parseWorkspacePatterns(
  text: string,
  findings: AdoptionFinding[],
): string[] {
  try {
    // Preserve YAML syntax and inspect parser diagnostics before using partial data.
    // https://eemeli.org/yaml/#parsing-documents
    const document = parseDocument(text);
    if (document.errors.length > 0 || document.warnings.length > 0) {
      throw new Error("Unsupported or malformed YAML");
    }
    const value: unknown = document.toJS();
    if (!isRecord(value) || !Array.isArray(value.packages) ||
      value.packages.length === 0 || !value.packages.every(isWorkspacePattern)) {
      throw new Error("Expected a non-empty list of workspace patterns");
    }
    return value.packages;
  } catch {
    addFinding(
      findings,
      "WORKSPACE_CONFIG_INVALID",
      "pnpm-workspace.yaml must be one valid YAML mapping with a non-empty packages list of strings and no unsupported tags or directives",
      "pnpm-workspace.yaml",
    );
    return [];
  }
}

function isWorkspacePattern(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" &&
    !value.includes("\0") && !/[\r\n]/.test(value);
}

async function readManifest(
  root: string,
  packagePath: string,
  findings: AdoptionFinding[],
): Promise<PackageManifest | undefined> {
  try {
    const value = JSON.parse(
      await readFile(resolve(root, packagePath), "utf8"),
    ) as unknown;
    if (!isRecord(value)) throw new Error("invalid shape");
    return value;
  } catch {
    addFinding(
      findings,
      "PACKAGE_JSON_INVALID",
      "Package manifest is not a valid JSON object",
      packagePath,
    );
    return undefined;
  }
}

async function inspectTarget(
  root: string,
  packagePath: string,
  manifest: PackageManifest,
): Promise<AdoptionTarget> {
  const targetPath = toPosix(dirname(packagePath));
  const scripts = stringRecord(manifest.scripts);
  const dependencyNames = Object.keys({
    ...stringRecord(manifest.dependencies),
    ...stringRecord(manifest.devDependencies),
    ...stringRecord(manifest.peerDependencies),
    ...stringRecord(manifest.optionalDependencies),
  });
  const frontendIndicators = dependencyNames
    .map((name) => FRONTEND_PACKAGES.get(name))
    .filter((value): value is string => value !== undefined)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();

  return {
    path: targetPath,
    packageName: typeof manifest.name === "string" ? manifest.name : null,
    typescriptConfigs: await findTypeScriptConfigs(root, targetPath),
    frontendIndicators,
    scripts: {
      typecheck: findTypecheckScript(scripts),
      test: detectedScript(scripts, "test"),
      build: detectedScript(scripts, "build"),
      dev: detectedScript(scripts, "dev"),
      start: detectedScript(scripts, "start"),
    },
    deployment: "review_required",
  };
}

async function findTypeScriptConfigs(root: string, targetPath: string): Promise<string[]> {
  const prefix = targetPath === "." ? "" : `${targetPath}/`;
  const configs: string[] = [];
  for await (const match of glob(`${prefix}tsconfig*.json`, { cwd: root })) {
    configs.push(toPosix(match));
  }
  return configs.sort();
}

function findTypecheckScript(scripts: Record<string, string>): DetectedScript | null {
  for (const name of ["typecheck", "type-check", "check:types"]) {
    const found = detectedScript(scripts, name);
    if (found) return found;
  }
  return scripts.check?.includes("tsc")
    ? { name: "check", command: scripts.check }
    : null;
}

function detectedScript(
  scripts: Record<string, string>,
  name: string,
): DetectedScript | null {
  const command = scripts[name];
  return command ? { name, command } : null;
}

export function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] =>
      typeof entry[1] === "string"
    ),
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function trimSlash(pattern: string): string {
  return pattern.replace(/\/$/, "");
}

function isUnsafeWorkspacePattern(pattern: string): boolean {
  const normalized = pattern.replaceAll("\\", "/");
  const absolute = normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized);
  const parentSegment = /(^|[/{,(])\.\.(?=$|[/},)])/.test(normalized);
  return absolute || parentSegment;
}

function toPosix(path: string): string {
  const normalized = path.split(sep).join("/");
  return normalized === "" ? "." : normalized;
}
