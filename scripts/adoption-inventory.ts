import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  AdoptionFinding,
  InventoryDecision,
  InventoryTarget,
  TargetInventory,
} from "./adoption-audit-types.js";
import { addFinding } from "./adoption-findings.js";

export async function readTargetInventory(
  root: string,
  findings: AdoptionFinding[],
): Promise<TargetInventory | null> {
  let text: string;
  try {
    text = await readFile(resolve(root, "harness.targets.json"), "utf8");
  } catch (error) {
    if (isMissingFile(error)) return null;
    addInvalidInventory(findings, "Cannot read harness.targets.json");
    return null;
  }

  try {
    return parseInventory(JSON.parse(text) as unknown, findings);
  } catch {
    addInvalidInventory(findings, "harness.targets.json is not valid JSON");
    return null;
  }
}

function parseInventory(
  value: unknown,
  findings: AdoptionFinding[],
): TargetInventory | null {
  if (!isRecord(value) || !Array.isArray(value.targets)) {
    addInvalidInventory(findings, "The target inventory must contain a targets array");
    return null;
  }
  if (!hasOnlyKeys(value, ["$schema", "version", "targets"]) ||
    ("$schema" in value && typeof value.$schema !== "string")) {
    addInvalidInventory(findings, "The target inventory contains unsupported fields");
    return null;
  }
  if (value.version !== 1) {
    addFinding(
      findings,
      "TARGET_INVENTORY_VERSION_UNSUPPORTED",
      "The target inventory version must be 1",
      "harness.targets.json",
    );
    return null;
  }

  const targets: InventoryTarget[] = [];
  const paths = new Set<string>();
  value.targets.forEach((target, index) => {
    const parsed = parseTarget(target, index, findings);
    if (!parsed) return;
    if (paths.has(parsed.path)) {
      addFinding(
        findings,
        "TARGET_PATH_DUPLICATE",
        `The target inventory contains path more than once: ${parsed.path}`,
        "harness.targets.json",
      );
      return;
    }
    paths.add(parsed.path);
    targets.push(parsed);
  });
  return { version: 1, targets };
}

function parseTarget(
  value: unknown,
  index: number,
  findings: AdoptionFinding[],
): InventoryTarget | null {
  const label = `targets[${index}]`;
  if (!isRecord(value) ||
    !hasOnlyKeys(value, [
      "path",
      "packageName",
      "deployable",
      "typecheck",
      "test",
      "build",
    ]) ||
    !isTargetPath(value.path)) {
    addTargetInvalid(findings, `${label} needs a safe relative path`);
    return null;
  }
  if (typeof value.deployable !== "boolean") {
    addTargetInvalid(findings, `${label} needs a deployable boolean`);
    return null;
  }
  if (!(typeof value.packageName === "string" || value.packageName === null)) {
    addTargetInvalid(findings, `${label} needs a packageName string or null`);
    return null;
  }

  const typecheck = parseDecision(value.typecheck, `${label}.typecheck`, findings);
  const test = parseDecision(value.test, `${label}.test`, findings);
  const build = parseDecision(value.build, `${label}.build`, findings);
  if (!typecheck || !test || !build) return null;
  if (value.deployable && "notApplicable" in build) {
    addFinding(
      findings,
      "DEPLOYABLE_BUILD_NOT_APPLICABLE",
      `${label}.build needs an exact command because the target is deployable`,
      "harness.targets.json",
    );
  }
  return {
    path: value.path,
    packageName: value.packageName,
    deployable: value.deployable,
    typecheck,
    test,
    build,
  };
}

function parseDecision(
  value: unknown,
  label: string,
  findings: AdoptionFinding[],
): InventoryDecision | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["command", "notApplicable"])) {
    addDecisionInvalid(findings, label);
    return null;
  }
  const command = nonEmptyString(value.command);
  const reason = nonEmptyString(value.notApplicable);
  if ((command === null) === (reason === null)) {
    addDecisionInvalid(findings, label);
    return null;
  }
  return command === null ? { notApplicable: reason ?? "" } : { command };
}

function isTargetPath(value: unknown): value is string {
  if (typeof value !== "string" || value === "") return false;
  if (value === ".") return true;
  if (value.startsWith("/") || value.includes("\\")) return false;
  return value.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function addInvalidInventory(findings: AdoptionFinding[], message: string): void {
  addFinding(findings, "TARGET_INVENTORY_INVALID", message, "harness.targets.json");
}

function addTargetInvalid(findings: AdoptionFinding[], message: string): void {
  addFinding(findings, "TARGET_ENTRY_INVALID", message, "harness.targets.json");
}

function addDecisionInvalid(findings: AdoptionFinding[], label: string): void {
  addFinding(
    findings,
    "TARGET_DECISION_INVALID",
    `${label} needs one command or one non-applicable reason`,
    "harness.targets.json",
  );
}

function isMissingFile(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}
