import {
  readMetricEvents,
  resolveMetricsFile,
} from "./workflow-metrics.js";
import {
  formatMetricsSummary,
  summarizeMetrics,
} from "./workflow-metrics-summary.js";

interface Options {
  file?: string;
  json: boolean;
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const events = await readMetricEvents(resolveMetricsFile(process.cwd(), options.file));
  const summary = summarizeMetrics(events);
  console.log(options.json ? JSON.stringify(summary, null, 2) : formatMetricsSummary(summary));
}

function parseOptions(args: string[]): Options {
  let file: string | undefined;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--") continue;
    if (arg === "--json") json = true;
    else if (arg === "--file") {
      file = args[index + 1];
      if (!file) throw usageError();
      index += 1;
    } else throw usageError();
  }
  return { ...(file ? { file } : {}), json };
}

function usageError(): Error {
  return new Error("Usage: summarize-metrics [--file path] [--json]");
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "Metrics summary failed");
  process.exitCode = 1;
}
