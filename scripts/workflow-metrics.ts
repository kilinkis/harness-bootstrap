import { appendFile, mkdir, readFile, rmdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export const METRIC_SCHEMA_VERSION = 1 as const;
const DEFAULT_METRICS_FILE = ".task-harness/metrics.jsonl";
const METRICS_FILE_ENV = "HARNESS_METRICS_FILE";
const MAX_EVENT_BYTES = 4096;
const MAX_TEXT_LENGTH = 256;
export const MAX_METRIC_NUMBER = Number.MAX_SAFE_INTEGER;
const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 10;
const CANONICAL_TIMESTAMP = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/;

export type GateName = "fast" | "docs" | "full";

export interface GateMetricEvent {
  schemaVersion: typeof METRIC_SCHEMA_VERSION;
  eventType: "gate";
  gate: GateName;
  outcome: "passed" | "failed";
  startedAt: string;
  wallTimeMs: number;
  exitCode: number;
}

export interface AgentRunMetricEvent {
  schemaVersion: typeof METRIC_SCHEMA_VERSION;
  eventType: "agent_run";
  startedAt: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  wallTimeMs?: number;
}

export type MetricEvent = GateMetricEvent | AgentRunMetricEvent;

const GATE_KEYS = new Set([
  "schemaVersion",
  "eventType",
  "gate",
  "outcome",
  "startedAt",
  "wallTimeMs",
  "exitCode",
]);
const AGENT_KEYS = new Set([
  "schemaVersion",
  "eventType",
  "startedAt",
  "provider",
  "model",
  "inputTokens",
  "outputTokens",
  "estimatedCostUsd",
  "wallTimeMs",
]);
const GATE_NAMES = new Set<GateName>(["fast", "docs", "full"]);

export function resolveMetricsFile(
  root: string,
  explicitPath?: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const configured = explicitPath ?? environment[METRICS_FILE_ENV] ?? DEFAULT_METRICS_FILE;
  if (!configured.trim()) throw metricError("metrics file path must be non-empty");
  return resolve(root, configured);
}

export function validateMetricEvent(value: unknown): MetricEvent {
  if (!isRecord(value)) throw metricError("event must be an object");
  if (value.schemaVersion !== METRIC_SCHEMA_VERSION) {
    throw metricError(`schemaVersion must be ${METRIC_SCHEMA_VERSION}`);
  }
  if (value.eventType === "gate") return validateGateEvent(value);
  if (value.eventType === "agent_run") return validateAgentRunEvent(value);
  throw metricError("eventType must be gate or agent_run");
}

export async function appendMetricEvent(path: string, event: unknown): Promise<void> {
  const validated = validateMetricEvent(event);
  const line = `${JSON.stringify(validated)}\n`;
  if (Buffer.byteLength(line, "utf8") > MAX_EVENT_BYTES) {
    throw metricError(`encoded event must not exceed ${MAX_EVENT_BYTES} bytes`);
  }
  await mkdir(dirname(path), { recursive: true });
  const lockPath = `${path}.lock`;
  await acquireAppendLock(lockPath);
  try {
    await appendFile(path, line, "utf8");
  } finally {
    await rmdir(lockPath);
  }
}

export async function readMetricEvents(path: string): Promise<MetricEvent[]> {
  let contents: string;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    if (isMissingFile(error)) return [];
    throw error;
  }
  return contents.split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    try {
      return [validateMetricEvent(JSON.parse(line) as unknown)];
    } catch (error) {
      const detail = error instanceof Error ? error.message : "invalid event";
      throw metricError(`line ${index + 1}: ${detail}`);
    }
  });
}

function validateGateEvent(value: Record<string, unknown>): GateMetricEvent {
  rejectUnknownKeys(value, GATE_KEYS);
  if (typeof value.gate !== "string" || !GATE_NAMES.has(value.gate as GateName)) {
    throw metricError("gate must be fast, docs, or full");
  }
  if (value.outcome !== "passed" && value.outcome !== "failed") {
    throw metricError("outcome must be passed or failed");
  }
  validateStartedAt(value.startedAt);
  validateNumber(value.wallTimeMs, "wallTimeMs");
  validateInteger(value.exitCode, "exitCode");
  if (value.exitCode > 255) throw metricError("exitCode must be at most 255");
  if ((value.exitCode === 0) !== (value.outcome === "passed")) {
    throw metricError("outcome must agree with exitCode");
  }
  return value as unknown as GateMetricEvent;
}

function validateAgentRunEvent(value: Record<string, unknown>): AgentRunMetricEvent {
  rejectUnknownKeys(value, AGENT_KEYS);
  validateStartedAt(value.startedAt);
  validateOptionalText(value.provider, "provider");
  validateOptionalText(value.model, "model");
  validateOptionalInteger(value.inputTokens, "inputTokens");
  validateOptionalInteger(value.outputTokens, "outputTokens");
  validateOptionalNumber(value.estimatedCostUsd, "estimatedCostUsd");
  validateOptionalNumber(value.wallTimeMs, "wallTimeMs");
  return value as unknown as AgentRunMetricEvent;
}

function rejectUnknownKeys(value: Record<string, unknown>, allowed: Set<string>): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) throw metricError(`unknown fields: ${unknown.sort().join(", ")}`);
}

function validateStartedAt(value: unknown): void {
  if (typeof value !== "string" || !CANONICAL_TIMESTAMP.test(value)) {
    throw metricError("startedAt must be a canonical ISO timestamp");
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw metricError("startedAt must be a canonical ISO timestamp");
  }
}

function validateOptionalText(value: unknown, field: string): void {
  if (value === undefined) return;
  if (typeof value !== "string" || !value.trim()) {
    throw metricError(`${field} must be non-empty when supplied`);
  }
  if ([...value].length > MAX_TEXT_LENGTH) {
    throw metricError(`${field} must not exceed ${MAX_TEXT_LENGTH} characters`);
  }
}

function validateOptionalNumber(value: unknown, field: string): void {
  if (value !== undefined) validateNumber(value, field);
}

function validateNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) ||
    value < 0 || value > MAX_METRIC_NUMBER) {
    throw metricError(
      `${field} must be finite and non-negative, and at most ${MAX_METRIC_NUMBER}`,
    );
  }
}

function validateOptionalInteger(value: unknown, field: string): void {
  if (value !== undefined) validateInteger(value, field);
}

function validateInteger(value: unknown, field: string): asserts value is number {
  validateNumber(value, field);
  if (!Number.isSafeInteger(value)) {
    throw metricError(`${field} must be an integer within the safe range`);
  }
}

async function acquireAppendLock(lockPath: string): Promise<void> {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (true) {
    try {
      await mkdir(lockPath);
      return;
    } catch (error) {
      if (!hasErrorCode(error, "EEXIST")) throw error;
      if (Date.now() >= deadline) {
        throw new Error(
          `METRIC_APPEND_LOCK_TIMEOUT: exceeded ${LOCK_TIMEOUT_MS} ms`,
          { cause: error },
        );
      }
      await delay(LOCK_RETRY_MS);
    }
  }
}

function metricError(message: string): Error {
  return new Error(`METRIC_EVENT_INVALID: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMissingFile(error: unknown): boolean {
  return hasErrorCode(error, "ENOENT");
}

function hasErrorCode(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code;
}
