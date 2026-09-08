import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { collectTargetInventoryAudit } from "./adoption-audit.js";
import type { AdoptionFinding, AdoptionTarget } from "./adoption-audit-types.js";
import {
  isRecord,
  stringRecord,
} from "./adoption-target-discovery.js";

export interface ImpactCommand {
  kind: "typecheck" | "test" | "build";
  command: string;
}

export interface AffectedTarget {
  path: string;
  packageName: string | null;
  reasons: string[];
  commands: ImpactCommand[];
}

export interface ImpactAnalysisResult {
  changedPaths: string[];
  affectedTargets: AffectedTarget[];
  uncertainties: string[];
  fullGateRequired: true;
}

const GLOBAL_FILES = new Set([
  ".npmrc",
  "harness.targets.json",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
]);

export async function analyzeImpact(
  root: string,
  changedPaths: string[],
): Promise<ImpactAnalysisResult> {
  const { targets, inventory, findings } = await collectTargetInventoryAudit(root);
  const uncertainties = findings.map(formatFinding);

  const normalizedPaths = normalizeChangedPaths(changedPaths, uncertainties);
  const reasons = new Map<string, Set<string>>();
  for (const path of normalizedPaths) {
    addDirectImpact(path, targets, reasons, uncertainties);
  }

  const consumers = await buildConsumerGraph(root, targets, uncertainties);
  addTransitiveConsumers(reasons, consumers);
  const inventoryByPath = new Map(
    inventory?.targets.map((target) => [target.path, target]) ?? [],
  );
  const targetsByPath = new Map(targets.map((target) => [target.path, target]));

  return {
    changedPaths: normalizedPaths,
    affectedTargets: [...reasons.entries()]
      .map(([path, targetReasons]) => {
        const target = targetsByPath.get(path);
        const declared = inventoryByPath.get(path);
        return {
          path,
          packageName: target?.packageName ?? declared?.packageName ?? null,
          reasons: [...targetReasons].sort(),
          commands: declared ? commandsFor(declared) : [],
        };
      })
      .sort((left, right) => left.path.localeCompare(right.path)),
    uncertainties: [...new Set(uncertainties)].sort(),
    fullGateRequired: true,
  };
}

function normalizeChangedPaths(paths: string[], uncertainties: string[]): string[] {
  const normalized: string[] = [];
  for (const path of paths) {
    const value = path.replaceAll("\\", "/").replace(/^\.\//, "");
    if (!value || value.startsWith("/") || value.split("/").includes("..")) {
      uncertainties.push(`Changed path is outside the repository contract: ${path}`);
      continue;
    }
    normalized.push(value);
  }
  return [...new Set(normalized)].sort();
}

function addDirectImpact(
  changedPath: string,
  targets: AdoptionTarget[],
  reasons: Map<string, Set<string>>,
  uncertainties: string[],
): void {
  if (isGlobalPath(changedPath)) {
    for (const target of targets) {
      addReason(reasons, target.path, `${changedPath} is repository-wide configuration`);
    }
    return;
  }
  const owner = findOwner(changedPath, targets);
  if (owner) {
    addReason(reasons, owner.path, `${changedPath} belongs to ${owner.path}`);
    return;
  }
  uncertainties.push(`No declared target owns changed path: ${changedPath}`);
}

function findOwner(path: string, targets: AdoptionTarget[]): AdoptionTarget | undefined {
  return [...targets]
    .filter((target) => target.path === "." || path === target.path ||
      path.startsWith(`${target.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0];
}

function isGlobalPath(path: string): boolean {
  return GLOBAL_FILES.has(path) || /^tsconfig(?:\.[^/]+)?\.json$/.test(path);
}

async function buildConsumerGraph(
  root: string,
  targets: AdoptionTarget[],
  uncertainties: string[],
): Promise<Map<string, Set<string>>> {
  const pathByPackageName = new Map(
    targets.flatMap((target) => target.packageName ? [[target.packageName, target.path]] : []),
  );
  const consumers = new Map<string, Set<string>>();
  for (const target of targets) {
    const dependencies = await readDependencyNames(root, target.path, uncertainties);
    for (const dependency of dependencies) {
      const dependencyPath = pathByPackageName.get(dependency);
      if (dependencyPath) addReason(consumers, dependencyPath, target.path);
    }
  }
  return consumers;
}

async function readDependencyNames(
  root: string,
  targetPath: string,
  uncertainties: string[],
): Promise<string[]> {
  const manifestPath = targetPath === "." ? "package.json" : `${targetPath}/package.json`;
  try {
    const manifest = JSON.parse(
      await readFile(resolve(root, manifestPath), "utf8"),
    ) as unknown;
    if (!isRecord(manifest)) throw new Error("invalid manifest");
    return Object.keys({
      ...stringRecord(manifest.dependencies),
      ...stringRecord(manifest.devDependencies),
      ...stringRecord(manifest.peerDependencies),
      ...stringRecord(manifest.optionalDependencies),
    }).sort();
  } catch {
    uncertainties.push(`Cannot read dependencies from ${manifestPath}`);
    return [];
  }
}

function addTransitiveConsumers(
  reasons: Map<string, Set<string>>,
  consumers: Map<string, Set<string>>,
): void {
  const queue = [...reasons.keys()];
  for (const dependencyPath of queue) {
    for (const consumerPath of consumers.get(dependencyPath) ?? []) {
      const known = reasons.has(consumerPath);
      addReason(reasons, consumerPath, `depends on ${dependencyPath}`);
      if (!known) queue.push(consumerPath);
    }
  }
}

function commandsFor(target: {
  deployable: boolean;
  typecheck: { command: string } | { notApplicable: string };
  test: { command: string } | { notApplicable: string };
  build: { command: string } | { notApplicable: string };
}): ImpactCommand[] {
  const commands: ImpactCommand[] = [];
  if ("command" in target.typecheck) {
    commands.push({ kind: "typecheck", command: target.typecheck.command });
  }
  if ("command" in target.test) {
    commands.push({ kind: "test", command: target.test.command });
  }
  if ("command" in target.build) {
    commands.push({ kind: "build", command: target.build.command });
  }
  return commands;
}

function addReason(
  map: Map<string, Set<string>>,
  path: string,
  reason: string,
): void {
  const values = map.get(path) ?? new Set<string>();
  values.add(reason);
  map.set(path, values);
}

function formatFinding(finding: AdoptionFinding): string {
  return `${finding.code}: ${finding.message}`;
}
