import { isLegacyBootstrapFeature, readBootstrapHistory, type BootstrapHistory } from "./bootstrap-history.js";
import { addFinding, readText, type HarnessFinding } from "./harness-state-support.js";

export interface Feature {
  id: string;
  status: string;
  legacy: boolean;
}

const ALLOWED_STATUSES = new Set([
  "pending",
  "in_progress",
  "in_review",
  "done",
  "skipped",
]);
const SAFE_FEATURE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_ACTIVE_ACCEPTANCE_CRITERIA = 5;

export async function readFeatureQueue(
  root: string,
  findings: HarnessFinding[],
): Promise<Feature[] | undefined> {
  const queuePath = "feature_list.json";
  const queueText = await readText(root, queuePath, "QUEUE_READ_FAILED", findings);
  if (queueText === undefined) return undefined;

  const queue = parseQueue(queueText, queuePath, findings);
  if (queue === undefined) return undefined;

  let history: BootstrapHistory;
  try { history = await readBootstrapHistory(root); }
  catch (error) {
    addFinding(findings, "BOOTSTRAP_HISTORY_INVALID", String(error), "harness.bootstrap-history.json");
    return undefined;
  }
  const features = validateFeatures(queue, queuePath, findings, history);
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

  return features;
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
  history: BootstrapHistory,
): Feature[] {
  const features: Feature[] = [];
  const seenIds = new Set<string>();

  queue.forEach((value, index) => {
    const feature = validateFeature(value, index, path, seenIds, findings, history);
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
  history: BootstrapHistory,
): Feature | undefined {
  if (!isRecord(value)) {
    addFinding(findings, "FEATURE_INVALID_SHAPE", `Feature at index ${index} must be an object`, path);
    return undefined;
  }
  const id = validateFeatureId(value.id, index, path, seenIds, findings);
  const label = id ?? `index ${index}`;
  const status = typeof value.status === "string" ? value.status : "";
  validateTitle(value.title, label, path, findings);
  validateAcceptance(value.acceptance_criteria, status, label, path, findings);
  validateStatus(status, label, path, findings);
  validateSkipReason(value.skip_reason, status, label, path, findings);
  const legacy = isLegacyBootstrapFeature(value, history);
  validateIssue(value, label, path, findings, legacy);
  return id && ALLOWED_STATUSES.has(status)
    ? { id, status, legacy } : undefined;
}

function validateSkipReason(
  value: unknown,
  status: string,
  label: string,
  path: string,
  findings: HarnessFinding[],
): void {
  if (status === "skipped" && (typeof value !== "string" || !value.trim())) {
    addFinding(
      findings,
      "FEATURE_SKIP_REASON_MISSING",
      `${label}: skipped feature needs a non-empty reason`,
      path,
    );
  }
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
  status: string,
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
    return;
  }
  if (Array.isArray(value) && (status === "in_progress" || status === "in_review") &&
    value.length > MAX_ACTIVE_ACCEPTANCE_CRITERIA) {
    addFinding(
      findings,
      "FEATURE_ACCEPTANCE_LIMIT",
      `${label}: active feature has more than ${MAX_ACTIVE_ACCEPTANCE_CRITERIA} acceptance criteria`,
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
  legacy: boolean,
): void {
  const tracked = typeof value.issue === "string" && Boolean(value.issue.trim());
  if (Object.hasOwn(value, "issue") && !tracked) {
    addFinding(findings, "FEATURE_ISSUE_INVALID", `${label}: issue must be non-empty`, path);
  }
  if (!Object.hasOwn(value, "issue") && value.status === "done" && !legacy) {
    addFinding(findings, "FEATURE_ISSUE_MISSING", `${label}: completed work needs a local or remote work-item reference`, path);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
