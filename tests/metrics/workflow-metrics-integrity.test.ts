import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  appendMetricEvent,
  type AgentRunMetricEvent,
  METRIC_SCHEMA_VERSION,
  readMetricEvents,
  validateMetricEvent,
} from "../../scripts/workflow-metrics.js";
import { summarizeMetrics } from "../../scripts/workflow-metrics-summary.js";

const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TSX_BINARY = join(
  REPOSITORY_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);
const STARTED_AT = "2026-09-08T10:00:00.000Z";

void test("concurrent accepted appends preserve complete JSONL records", async () => {
  const root = await mkdtemp(join(tmpdir(), "metrics-concurrent-"));
  const file = join(root, "events.jsonl");
  try {
    const count = 40;
    await Promise.all(Array.from({ length: count }, (_, index) =>
      appendMetricEvent(file, agentEvent({ provider: `in-process-${index}` }))));
    const events = await readMetricEvents(file);
    assert.equal(events.length, count);
    assert.equal(new Set(events.map((event) =>
      event.eventType === "agent_run" ? event.provider : undefined)).size, count);
    assert.equal((await readFile(file, "utf8")).trim().split("\n").length, count);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("cooperating processes serialize accepted appends and reject huge identifiers", async () => {
  const root = await mkdtemp(join(tmpdir(), "metrics-processes-"));
  const file = join(root, "events.jsonl");
  try {
    await assert.rejects(
      appendMetricEvent(file, agentEvent({ provider: "x".repeat(1_200_000) })),
      /must not exceed 256 characters/,
    );
    const count = 12;
    const results = await Promise.all(Array.from({ length: count }, (_, index) =>
      runAgentRecorder(file, `process-${index}`)));
    assert.ok(results.every(({ exitCode }) => exitCode === 0));
    const lines = (await readFile(file, "utf8")).trim().split("\n");
    assert.equal(lines.length, count);
    const events = lines.map((line) => validateMetricEvent(JSON.parse(line) as unknown));
    assert.equal(events.length, count);
    assert.equal(new Set(events.map((event) =>
      event.eventType === "agent_run" ? event.provider : undefined)).size, count);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("numeric boundaries reject unsafe events and overflowing summaries", () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  assert.doesNotThrow(() => validateMetricEvent(agentEvent({
    inputTokens: maximum,
    outputTokens: maximum,
    estimatedCostUsd: maximum,
    wallTimeMs: maximum,
  })));
  for (const field of ["inputTokens", "outputTokens", "estimatedCostUsd", "wallTimeMs"]) {
    assert.throws(
      () => validateMetricEvent(agentEvent({ [field]: maximum + 1 })),
      /at most 9007199254740991/,
    );
    assert.throws(
      () => summarizeMetrics([
        agentEvent({ [field]: maximum }),
        agentEvent({ [field]: 1 }),
      ]),
      /total exceeds 9007199254740991/,
    );
  }
});

void test("human and JSON summaries fail instead of emitting null totals", async () => {
  const root = await mkdtemp(join(tmpdir(), "metrics-overflow-"));
  const file = join(root, "events.jsonl");
  try {
    await appendMetricEvent(file, agentEvent({ estimatedCostUsd: Number.MAX_SAFE_INTEGER }));
    await appendMetricEvent(file, agentEvent({ estimatedCostUsd: 1 }));
    const [human, json] = await Promise.all([
      runScript("summarize-metrics.ts", ["--file", file]),
      runScript("summarize-metrics.ts", ["--file", file, "--json"]),
    ]);
    for (const result of [human, json]) {
      assert.equal(result.exitCode, 1);
      assert.match(result.stderr, /total exceeds 9007199254740991/);
      assert.doesNotMatch(result.stdout, /null|Infinity/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function agentEvent(
  values: Partial<Omit<AgentRunMetricEvent, "schemaVersion" | "eventType" | "startedAt">>,
): AgentRunMetricEvent {
  return {
    schemaVersion: METRIC_SCHEMA_VERSION,
    eventType: "agent_run",
    startedAt: STARTED_AT,
    ...values,
  };
}

function runAgentRecorder(file: string, provider: string): Promise<CommandResult> {
  return runScript("record-agent-run.ts", ["--file", file, "--provider", provider]);
}

function runScript(script: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolveResult, reject) => {
    const child = execFile(
      TSX_BINARY,
      [join(REPOSITORY_ROOT, "scripts", script), ...args],
      { encoding: "utf8" },
      (error, stdout, stderr) => {
        const exitCode = error && "code" in error && typeof error.code === "number"
          ? error.code
          : 0;
        resolveResult({ exitCode, stdout, stderr });
      },
    );
    child.on("error", (error) => {
      reject(new Error("Fixture command failed to start", { cause: error }));
    });
  });
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}
