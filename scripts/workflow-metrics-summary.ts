import {
  type AgentRunMetricEvent,
  type GateMetricEvent,
  type GateName,
  MAX_METRIC_NUMBER,
  type MetricEvent,
  METRIC_SCHEMA_VERSION,
} from "./workflow-metrics.js";

export interface MetricsSummary {
  schemaVersion: typeof METRIC_SCHEMA_VERSION;
  eventCount: number;
  gates: {
    count: number;
    failures: number;
    wallTimeMs: number;
    byName: Record<GateName, { count: number; failures: number; wallTimeMs: number }>;
  };
  agentRuns: {
    count: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    wallTimeMs: number;
  };
}

export function summarizeMetrics(events: MetricEvent[]): MetricsSummary {
  const byName = {
    fast: emptyGateSummary(),
    docs: emptyGateSummary(),
    full: emptyGateSummary(),
  };
  const summary: MetricsSummary = {
    schemaVersion: METRIC_SCHEMA_VERSION,
    eventCount: events.length,
    gates: { count: 0, failures: 0, wallTimeMs: 0, byName },
    agentRuns: {
      count: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      wallTimeMs: 0,
    },
  };
  for (const event of events) {
    if (event.eventType === "gate") addGate(summary, event);
    else addAgentRun(summary, event);
  }
  return summary;
}

export function formatMetricsSummary(summary: MetricsSummary): string {
  return [
    "Workflow metrics summary",
    `Events: ${summary.eventCount}`,
    `Gates: ${summary.gates.count}`,
    `Gate failures: ${summary.gates.failures}`,
    `Gate wall time: ${summary.gates.wallTimeMs} ms`,
    `Fast gates: ${formatGateCount(summary.gates.byName.fast)}`,
    `Docs gates: ${formatGateCount(summary.gates.byName.docs)}`,
    `Full gates: ${formatGateCount(summary.gates.byName.full)}`,
    `Agent runs: ${summary.agentRuns.count}`,
    `Agent input tokens: ${summary.agentRuns.inputTokens}`,
    `Agent output tokens: ${summary.agentRuns.outputTokens}`,
    `Agent estimated cost: $${summary.agentRuns.estimatedCostUsd.toFixed(6)}`,
    `Agent wall time: ${summary.agentRuns.wallTimeMs} ms`,
  ].join("\n");
}

function formatGateCount(value: { count: number; failures: number }): string {
  return `${value.count} (${value.failures} failures)`;
}

function emptyGateSummary(): { count: number; failures: number; wallTimeMs: number } {
  return { count: 0, failures: 0, wallTimeMs: 0 };
}

function addGate(summary: MetricsSummary, event: GateMetricEvent): void {
  summary.gates.count += 1;
  summary.gates.wallTimeMs = checkedAdd(summary.gates.wallTimeMs, event.wallTimeMs, "gate wall time");
  const gate = summary.gates.byName[event.gate];
  gate.count += 1;
  gate.wallTimeMs = checkedAdd(gate.wallTimeMs, event.wallTimeMs, `${event.gate} wall time`);
  if (event.outcome === "failed") {
    summary.gates.failures += 1;
    gate.failures += 1;
  }
}

function addAgentRun(summary: MetricsSummary, event: AgentRunMetricEvent): void {
  summary.agentRuns.count += 1;
  summary.agentRuns.inputTokens = checkedAdd(
    summary.agentRuns.inputTokens,
    event.inputTokens ?? 0,
    "agent input tokens",
  );
  summary.agentRuns.outputTokens = checkedAdd(
    summary.agentRuns.outputTokens,
    event.outputTokens ?? 0,
    "agent output tokens",
  );
  summary.agentRuns.estimatedCostUsd = checkedAdd(
    summary.agentRuns.estimatedCostUsd,
    event.estimatedCostUsd ?? 0,
    "agent estimated cost",
  );
  summary.agentRuns.wallTimeMs = checkedAdd(
    summary.agentRuns.wallTimeMs,
    event.wallTimeMs ?? 0,
    "agent wall time",
  );
}

function checkedAdd(total: number, value: number, field: string): number {
  const result = total + value;
  if (!Number.isFinite(result) || result > MAX_METRIC_NUMBER) {
    throw new Error(`METRIC_EVENT_INVALID: ${field} total exceeds ${MAX_METRIC_NUMBER}`);
  }
  return result;
}
