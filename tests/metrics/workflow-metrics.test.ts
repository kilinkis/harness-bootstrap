import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  appendMetricEvent,
  type GateMetricEvent,
  METRIC_SCHEMA_VERSION,
  readMetricEvents,
  resolveMetricsFile,
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

void test("event validation rejects unsafe fields and invalid numbers", () => {
  const startedAt = "2026-09-08T10:00:00.000Z";
  assert.deepEqual(validateMetricEvent({
    schemaVersion: 1,
    eventType: "agent_run",
    startedAt,
  }), {
    schemaVersion: 1,
    eventType: "agent_run",
    startedAt,
  });
  for (const field of ["inputTokens", "outputTokens", "estimatedCostUsd", "wallTimeMs"]) {
    for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.throws(
        () => validateMetricEvent({
          schemaVersion: 1,
          eventType: "agent_run",
          startedAt,
          [field]: value,
        }),
        /finite and non-negative/,
      );
    }
  }
  assert.throws(() => validateMetricEvent({
    schemaVersion: 1,
    eventType: "agent_run",
    startedAt,
    inputTokens: 0.5,
  }), /must be an integer/);
  assert.throws(() => validateMetricEvent({
    schemaVersion: 1,
    eventType: "agent_run",
    startedAt: "not-a-date",
  }), /canonical ISO timestamp/);
  assert.throws(() => validateMetricEvent({
    schemaVersion: 1,
    eventType: "agent_run",
    startedAt,
    prompt: "must not be stored",
  }), /unknown fields: prompt/);
  assert.throws(() => validateMetricEvent({
    ...gateEvent("passed", 1, 0),
    exitCode: 2,
  }), /outcome must agree with exitCode/);
});

void test("storage appends events as JSON Lines", async () => {
  const root = await mkdtemp(join(tmpdir(), "workflow-metrics-"));
  const file = join(root, "events.jsonl");
  try {
    assert.equal(
      resolveMetricsFile(root, undefined, { HARNESS_METRICS_FILE: "ci/events.jsonl" }),
      join(root, "ci/events.jsonl"),
    );
    await appendMetricEvent(file, gateEvent("passed", 10, 0));
    await appendMetricEvent(file, {
      schemaVersion: METRIC_SCHEMA_VERSION,
      eventType: "agent_run",
      startedAt: "2026-09-08T10:01:00.000Z",
      inputTokens: 12,
    });
    const lines = (await readFile(file, "utf8")).trim().split("\n");
    assert.equal(lines.length, 2);
    assert.equal((JSON.parse(lines[0] ?? "") as { eventType: string }).eventType, "gate");
    assert.equal((JSON.parse(lines[1] ?? "") as { eventType: string }).eventType, "agent_run");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("summaries total gates, failures, wall time, tokens, and cost", () => {
  const summary = summarizeMetrics([
    gateEvent("passed", 10, 0, "fast"),
    gateEvent("failed", 20, 7, "docs"),
    {
      schemaVersion: METRIC_SCHEMA_VERSION,
      eventType: "agent_run",
      startedAt: "2026-09-08T10:01:00.000Z",
      inputTokens: 100,
      outputTokens: 25,
      estimatedCostUsd: 0.5,
      wallTimeMs: 40,
    },
    {
      schemaVersion: METRIC_SCHEMA_VERSION,
      eventType: "agent_run",
      startedAt: "2026-09-08T10:02:00.000Z",
    },
  ]);
  assert.equal(summary.gates.count, 2);
  assert.equal(summary.gates.failures, 1);
  assert.equal(summary.gates.wallTimeMs, 30);
  assert.equal(summary.gates.byName.docs.failures, 1);
  assert.deepEqual(summary.agentRuns, {
    count: 2,
    inputTokens: 100,
    outputTokens: 25,
    estimatedCostUsd: 0.5,
    wallTimeMs: 40,
  });
});

void test("gate recording preserves success and failure exit status", async () => {
  const root = await mkdtemp(join(tmpdir(), "gate-metrics-"));
  const file = join(root, "events.jsonl");
  try {
    const success = await runScript("record-gate.ts", [
      "fast", "--file", file, "--", process.execPath, "-e", "process.exit(0)",
    ]);
    const failure = await runScript("record-gate.ts", [
      "full", "--file", file, "--", process.execPath, "-e", "process.exit(7)",
    ]);
    assert.equal(success.exitCode, 0, success.stderr);
    assert.equal(failure.exitCode, 7, failure.stderr);
    const events = await readMetricEvents(file) as GateMetricEvent[];
    assert.deepEqual(events.map(({ gate, outcome, exitCode }) => ({ gate, outcome, exitCode })), [
      { gate: "fast", outcome: "passed", exitCode: 0 },
      { gate: "full", outcome: "failed", exitCode: 7 },
    ]);
    assert.ok(events.every(({ wallTimeMs }) => wallTimeMs >= 0));
    assert.deepEqual(Object.keys(events[0] ?? {}).sort(), [
      "eventType", "exitCode", "gate", "outcome", "schemaVersion", "startedAt", "wallTimeMs",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("a metrics write failure cannot hide a gate failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "gate-metrics-failure-"));
  try {
    const success = await runScript("record-gate.ts", [
      "docs", "--file", root, "--", process.execPath, "-e", "process.exit(0)",
    ]);
    const failure = await runScript("record-gate.ts", [
      "docs", "--file", root, "--", process.execPath, "-e", "process.exit(9)",
    ]);
    assert.equal(success.exitCode, 0);
    assert.equal(failure.exitCode, 9);
    assert.match(success.stderr, /Metrics collection failed/);
    assert.match(failure.stderr, /Metrics collection failed/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("the agent recorder omits unavailable values and validates supplied values", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-metrics-"));
  const file = join(root, "events.jsonl");
  try {
    const recorded = await runScript("record-agent-run.ts", [
      "--file", file,
      "--provider", "openai",
      "--model", "example-model",
      "--input-tokens", "100",
      "--output-tokens", "25",
      "--estimated-cost-usd", "0.5",
      "--wall-time-ms", "40",
    ]);
    const omitted = await runScript("record-agent-run.ts", ["--file", file]);
    const invalid = await runScript("record-agent-run.ts", [
      "--file", file, "--input-tokens", "-1",
    ]);
    assert.equal(recorded.exitCode, 0, recorded.stderr);
    assert.equal(omitted.exitCode, 0, omitted.stderr);
    assert.equal(invalid.exitCode, 1);
    const events = await readMetricEvents(file);
    assert.equal(events.length, 2);
    assert.deepEqual(events[0]?.eventType === "agent_run" ? {
      provider: events[0].provider,
      model: events[0].model,
      inputTokens: events[0].inputTokens,
      outputTokens: events[0].outputTokens,
      estimatedCostUsd: events[0].estimatedCostUsd,
      wallTimeMs: events[0].wallTimeMs,
    } : {}, {
      provider: "openai",
      model: "example-model",
      inputTokens: 100,
      outputTokens: 25,
      estimatedCostUsd: 0.5,
      wallTimeMs: 40,
    });
    assert.deepEqual(Object.keys(events[1] ?? {}).sort(), [
      "eventType", "schemaVersion", "startedAt",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("summary command supports human and JSON output", async () => {
  const root = await mkdtemp(join(tmpdir(), "metrics-summary-"));
  const file = join(root, "events.jsonl");
  try {
    await appendMetricEvent(file, gateEvent("failed", 20, 2));
    const human = await runScript("summarize-metrics.ts", ["--file", file]);
    const json = await runScript("summarize-metrics.ts", ["--file", file, "--json"]);
    assert.equal(human.exitCode, 0, human.stderr);
    assert.match(human.stdout, /Gate failures: 1/);
    assert.match(human.stdout, /Full gates: 1 \(1 failures\)/);
    assert.equal(json.exitCode, 0, json.stderr);
    assert.equal((JSON.parse(json.stdout) as { gates: { failures: number } }).gates.failures, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("default metrics storage is ignored by Git", async () => {
  const root = await mkdtemp(join(tmpdir(), "metrics-ignore-"));
  try {
    await runCommand("git", ["init", "--quiet"], root);
    await writeFile(
      join(root, ".gitignore"),
      await readFile(join(REPOSITORY_ROOT, ".gitignore"), "utf8"),
    );
    const file = resolveMetricsFile(root, undefined, {});
    await appendMetricEvent(file, gateEvent("passed", 1, 0));
    const result = await runCommand(
      "git",
      ["check-ignore", "--quiet", ".task-harness/metrics.jsonl"],
      root,
    );
    assert.equal(result.exitCode, 0, result.stderr);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function gateEvent(
  outcome: "passed" | "failed",
  wallTimeMs: number,
  exitCode: number,
  gate: "fast" | "docs" | "full" = "full",
): GateMetricEvent {
  return {
    schemaVersion: METRIC_SCHEMA_VERSION,
    eventType: "gate",
    gate,
    outcome,
    startedAt: "2026-09-08T10:00:00.000Z",
    wallTimeMs,
    exitCode,
  };
}

function runScript(script: string, args: string[]): Promise<CommandResult> {
  return runCommand(TSX_BINARY, [join(REPOSITORY_ROOT, "scripts", script), ...args]);
}

interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function runCommand(command: string, args: string[], cwd?: string): Promise<CommandResult> {
  return new Promise((resolveResult, reject) => {
    const child = execFile(command, args, { cwd, encoding: "utf8" }, (error, stdout, stderr) => {
      const exitCode = error && "code" in error && typeof error.code === "number"
        ? error.code
        : 0;
      resolveResult({ exitCode, stdout, stderr });
    });
    child.on("error", (error) => {
      reject(new Error("Fixture command failed to start", { cause: error }));
    });
  });
}
