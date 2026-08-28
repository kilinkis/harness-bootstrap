import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { validateFeatureEvidence } from "./harness-evidence.js";
import {
  addFinding,
  containsFeatureId,
  readText,
  type Feature,
  type HarnessFinding,
} from "./harness-state-support.js";

export type { HarnessFinding } from "./harness-state-support.js";

const ALLOWED_STATUSES = new Set(["pending", "in_progress", "in_review", "done"]);
const SAFE_FEATURE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export async function validateHarnessState(root: string): Promise<HarnessFinding[]> {
  const findings: HarnessFinding[] = [];
  const queuePath = "feature_list.json";
  const queueText = await readText(root, queuePath, "QUEUE_READ_FAILED", findings);
  if (queueText === undefined) return findings;

  const queue = parseQueue(queueText, queuePath, findings);
  if (queue === undefined) return findings;

  const features = validateFeatures(queue, queuePath, findings);
  const active = features.filter(({ status }) =>
    status === "in_progress" || status === "in_review"
  );
  if (active.length > 1) {
    addFinding(
      findings,
      "ACTIVE_FEATURE_LIMIT",
      `Only one feature can be active in the shared workstream: ${active.map(({ id }) => id).join(", ")}`,
      queuePath,
    );
  }

  await validateActiveState(root, active, findings);
  await validateFeatureEvidence(root, features, findings);
  return findings;
}

function parseQueue(
  text: string,
  path: string,
  findings: HarnessFinding[],
): unknown[] | undefined {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    addFinding(findings, "QUEUE_INVALID_JSON", "Feature queue is not valid JSON", path);
    return undefined;
  }
  if (!Array.isArray(value)) {
    addFinding(findings, "QUEUE_INVALID_SHAPE", "Feature queue must be an array", path);
    return undefined;
  }
  return value as unknown[];
}

function validateFeatures(
  queue: unknown[],
  path: string,
  findings: HarnessFinding[],
): Feature[] {
  const features: Feature[] = [];
  const seenIds = new Set<string>();

  queue.forEach((value, index) => {
    const feature = validateFeature(value, index, path, seenIds, findings);
    if (feature) features.push(feature);
  });

  return features;
}

function validateFeature(
  value: unknown,
  index: number,
  path: string,
  seenIds: Set<string>,
  findings: HarnessFinding[],
): Feature | undefined {
  if (!isRecord(value)) {
    addFinding(findings, "FEATURE_INVALID_SHAPE", `Feature at index ${index} must be an object`, path);
    return undefined;
  }
  const id = validateFeatureId(value.id, index, path, seenIds, findings);
  const label = id ?? `index ${index}`;
  const status = typeof value.status === "string" ? value.status : "";
  validateTitle(value.title, label, path, findings);
  validateAcceptance(value.acceptance_criteria, label, path, findings);
  validateStatus(status, label, path, findings);
  const tracked = validateIssue(value, label, path, findings);
  return id && ALLOWED_STATUSES.has(status) ? { id, status, tracked } : undefined;
}

function validateFeatureId(
  value: unknown,
  index: number,
  path: string,
  seenIds: Set<string>,
  findings: HarnessFinding[],
): string | undefined {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id) {
    addFinding(findings, "FEATURE_ID_MISSING", `Feature at index ${index} needs an ID`, path);
    return undefined;
  }
  if (!SAFE_FEATURE_ID.test(id)) {
    addFinding(findings, "FEATURE_ID_INVALID", `${id}: ID contains unsafe characters`, path);
    return undefined;
  }
  if (seenIds.has(id)) {
    addFinding(findings, "FEATURE_ID_DUPLICATE", `${id}: ID is duplicated`, path);
  } else {
    seenIds.add(id);
  }
  return id;
}

function validateTitle(
  value: unknown,
  label: string,
  path: string,
  findings: HarnessFinding[],
): void {
  if (typeof value !== "string" || !value.trim()) {
    addFinding(findings, "FEATURE_TITLE_MISSING", `${label}: title is required`, path);
  }
}

function validateAcceptance(
  value: unknown,
  label: string,
  path: string,
  findings: HarnessFinding[],
): void {
  const valid = Array.isArray(value) &&
    value.length > 0 &&
    value.every((criterion) => typeof criterion === "string" && Boolean(criterion.trim()));
  if (!valid) {
    addFinding(
      findings,
      "FEATURE_ACCEPTANCE_MISSING",
      `${label}: non-empty acceptance criteria are required`,
      path,
    );
  }
}

function validateStatus(
  status: string,
  label: string,
  path: string,
  findings: HarnessFinding[],
): void {
  if (!ALLOWED_STATUSES.has(status)) {
    addFinding(findings, "FEATURE_STATUS_INVALID", `${label}: invalid status`, path);
  }
}

function validateIssue(
  value: Record<string, unknown>,
  label: string,
  path: string,
  findings: HarnessFinding[],
): boolean {
  const tracked = typeof value.issue === "string" && Boolean(value.issue.trim());
  if (Object.hasOwn(value, "issue") && !tracked) {
    addFinding(findings, "FEATURE_ISSUE_INVALID", `${label}: issue must be non-empty`, path);
  }
  return tracked;
}

async function validateActiveState(
  root: string,
  active: Feature[],
  findings: HarnessFinding[],
): Promise<void> {
  if (active.length === 0) return;
  const path = "progress/current.md";
  const current = await readText(root, path, "CURRENT_PROGRESS_MISSING", findings);
  if (current === undefined) return;

  for (const feature of active) {
    if (!containsFeatureId(current, feature.id)) {
      addFinding(
        findings,
        "ACTIVE_FEATURE_NOT_CURRENT",
        `${feature.id}: active feature is not recorded in current progress`,
        path,
      );
    }
  }
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function main(): Promise<void> {
  const root = resolve(process.argv[2] ?? ".");
  const findings = await validateHarnessState(root);
  if (findings.length === 0) {
    console.log("harness state: valid");
    return;
  }
  for (const finding of findings) {
    console.error(`${finding.code}: ${finding.message}`);
  }
  process.exitCode = 1;
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  await main();
}
