import {
  appendMetricEvent,
  type AgentRunMetricEvent,
  METRIC_SCHEMA_VERSION,
  resolveMetricsFile,
} from "./workflow-metrics.js";

interface Options {
  file?: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  wallTimeMs?: number;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const event: AgentRunMetricEvent = {
    schemaVersion: METRIC_SCHEMA_VERSION,
    eventType: "agent_run",
    startedAt: new Date().toISOString(),
    ...optionalText("provider", options.provider),
    ...optionalText("model", options.model),
    ...optionalNumber("inputTokens", options.inputTokens),
    ...optionalNumber("outputTokens", options.outputTokens),
    ...optionalNumber("estimatedCostUsd", options.estimatedCostUsd),
    ...optionalNumber("wallTimeMs", options.wallTimeMs),
  };
  await appendMetricEvent(resolveMetricsFile(process.cwd(), options.file), event);
  console.log("Agent run metric recorded.");
}

function parseOptions(args: string[]): Options {
  const options: Options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") continue;
    const value = args[index + 1];
    if (!arg || !value) throw usageError();
    if (arg === "--file") options.file = value;
    else if (arg === "--provider") options.provider = value;
    else if (arg === "--model") options.model = value;
    else if (arg === "--input-tokens") options.inputTokens = parseNumber(value, arg, true);
    else if (arg === "--output-tokens") options.outputTokens = parseNumber(value, arg, true);
    else if (arg === "--estimated-cost-usd") {
      options.estimatedCostUsd = parseNumber(value, arg, false);
    } else if (arg === "--wall-time-ms") options.wallTimeMs = parseNumber(value, arg, false);
    else throw usageError();
    index += 1;
  }
  return options;
}

function parseNumber(value: string, option: string, integer: boolean): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    throw new Error(`${option} must be ${integer ? "a non-negative integer" : "finite and non-negative"}`);
  }
  return parsed;
}

function optionalText<Key extends "provider" | "model">(
  key: Key,
  value: string | undefined,
): Partial<Pick<AgentRunMetricEvent, Key>> {
  return value === undefined ? {} : { [key]: value } as Pick<AgentRunMetricEvent, Key>;
}

function optionalNumber<Key extends "inputTokens" | "outputTokens" | "estimatedCostUsd" | "wallTimeMs">(
  key: Key,
  value: number | undefined,
): Partial<Pick<AgentRunMetricEvent, Key>> {
  return value === undefined ? {} : { [key]: value } as Pick<AgentRunMetricEvent, Key>;
}

function usageError(): Error {
  return new Error(
    "Usage: record-agent-run [--file path] [--provider name] [--model name] " +
    "[--input-tokens count] [--output-tokens count] [--estimated-cost-usd amount] " +
    "[--wall-time-ms duration]",
  );
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Agent metric recording failed");
  process.exitCode = 1;
}
