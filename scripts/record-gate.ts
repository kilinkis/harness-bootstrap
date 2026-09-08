import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";

import {
  appendMetricEvent,
  type GateName,
  METRIC_SCHEMA_VERSION,
  resolveMetricsFile,
} from "./workflow-metrics.js";

interface Options {
  gate: GateName;
  file?: string;
  command: string;
  commandArgs: string[];
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const exitCode = await runCommand(options.command, options.commandArgs);
  const wallTimeMs = Math.max(0, Math.round(performance.now() - start));
  try {
    await appendMetricEvent(resolveMetricsFile(process.cwd(), options.file), {
      schemaVersion: METRIC_SCHEMA_VERSION,
      eventType: "gate",
      gate: options.gate,
      outcome: exitCode === 0 ? "passed" : "failed",
      startedAt,
      wallTimeMs,
      exitCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown metrics error";
    console.error(`Metrics collection failed: ${message}`);
  }
  process.exitCode = exitCode;
}

function parseOptions(args: string[]): Options {
  const gate = args.shift();
  if (gate !== "fast" && gate !== "docs" && gate !== "full") throw usageError();
  let file: string | undefined;
  while (args[0] !== "--") {
    const arg = args.shift();
    if (arg !== "--file") throw usageError();
    file = args.shift();
    if (!file) throw usageError();
  }
  args.shift();
  const command = args.shift();
  if (!command) throw usageError();
  return { gate, ...(file ? { file } : {}), command, commandArgs: args };
}

function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolveExit) => {
    const child = spawn(command, args, { stdio: "inherit" });
    let settled = false;
    const finish = (exitCode: number): void => {
      if (settled) return;
      settled = true;
      resolveExit(exitCode);
    };
    child.once("error", () => finish(1));
    child.once("close", (code) => finish(code ?? 1));
  });
}

function usageError(): Error {
  return new Error("Usage: record-gate <fast|docs|full> [--file path] -- <command> [args...]");
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Gate metrics wrapper failed");
  process.exitCode = 2;
}
