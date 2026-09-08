import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateMetricEvent } from "../../scripts/workflow-metrics.js";

const REPOSITORY_ROOT = new URL("../../", import.meta.url);

interface MetricSchema {
  $defs: {
    common: { properties: { startedAt: { pattern: string } } };
    gate: {
      allOf: [unknown, {
        properties: {
          wallTimeMs: { maximum: number };
          exitCode: { maximum: number };
        };
        oneOf: {
          properties: {
            outcome: { const: "passed" | "failed" };
            exitCode: { const?: number; minimum?: number; maximum?: number };
          };
        }[];
      }];
    };
    agentRun: {
      allOf: [unknown, {
        properties: {
          provider: { maxLength: number };
          model: { maxLength: number };
          inputTokens: { maximum: number };
          outputTokens: { maximum: number };
          estimatedCostUsd: { maximum: number };
          wallTimeMs: { maximum: number };
        };
      }];
    };
  };
}

void test("schema and runtime agree on timestamp and gate outcome invariants", async () => {
  const schema = JSON.parse(
    await readFile(new URL("workflow-metrics.schema.json", REPOSITORY_ROOT), "utf8"),
  ) as MetricSchema;
  const timestampPattern = new RegExp(schema.$defs.common.properties.startedAt.pattern);
  const branches = schema.$defs.gate.allOf[1].oneOf;
  const cases = [
    gateEvent("passed", 0, "2026-09-08T10:00:00.000Z"),
    gateEvent("failed", 1, "2026-09-08T10:00:00.000Z"),
    gateEvent("passed", 1, "2026-09-08T10:00:00.000Z"),
    gateEvent("failed", 0, "2026-09-08T10:00:00.000Z"),
    gateEvent("passed", 0, "2026-09-08T10:00:00Z"),
  ];

  for (const event of cases) {
    assert.equal(runtimeAccepts(event), schemaInvariantsAccept(event, timestampPattern, branches));
  }
});

void test("schema and runtime publish the same size and numeric bounds", async () => {
  const schema = JSON.parse(
    await readFile(new URL("workflow-metrics.schema.json", REPOSITORY_ROOT), "utf8"),
  ) as MetricSchema;
  const gate = schema.$defs.gate.allOf[1].properties;
  const agent = schema.$defs.agentRun.allOf[1].properties;

  assert.equal(gate.exitCode.maximum, 255);
  assert.equal(gate.wallTimeMs.maximum, Number.MAX_SAFE_INTEGER);
  assert.equal(agent.provider.maxLength, 256);
  assert.equal(agent.model.maxLength, 256);
  for (const field of ["inputTokens", "outputTokens", "estimatedCostUsd", "wallTimeMs"] as const) {
    assert.equal(agent[field].maximum, Number.MAX_SAFE_INTEGER);
  }
  assert.equal(runtimeAccepts(gateEvent("failed", 256, "2026-09-08T10:00:00.000Z")), false);
});

function gateEvent(outcome: "passed" | "failed", exitCode: number, startedAt: string) {
  return {
    schemaVersion: 1,
    eventType: "gate",
    gate: "full",
    outcome,
    exitCode,
    wallTimeMs: 1,
    startedAt,
  };
}

function runtimeAccepts(event: unknown): boolean {
  try {
    validateMetricEvent(event);
    return true;
  } catch {
    return false;
  }
}

function schemaInvariantsAccept(
  event: ReturnType<typeof gateEvent>,
  timestampPattern: RegExp,
  branches: MetricSchema["$defs"]["gate"]["allOf"][1]["oneOf"],
): boolean {
  if (!timestampPattern.test(event.startedAt)) return false;
  return branches.some(({ properties }) => {
    if (properties.outcome.const !== event.outcome) return false;
    const rule = properties.exitCode;
    if (rule.const !== undefined) return event.exitCode === rule.const;
    return event.exitCode >= (rule.minimum ?? Number.NEGATIVE_INFINITY) &&
      event.exitCode <= (rule.maximum ?? Number.POSITIVE_INFINITY);
  });
}
