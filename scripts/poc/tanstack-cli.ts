import { ANTHROPIC_MODELS, anthropicText } from "@tanstack/ai-anthropic";
import { demoAdapters } from "./tanstack-demo.js";
import { runPoc, type PocAdapters } from "./tanstack.js";

function liveAdapters(): PocAdapters {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Live mode requires ANTHROPIC_API_KEY");
  const model = ANTHROPIC_MODELS.find((name) => name === process.env.ANTHROPIC_MODEL);
  if (!model) throw new Error("Set ANTHROPIC_MODEL to a model supported by @tanstack/ai-anthropic");
  return { implementer: anthropicText(model), reviewer: anthropicText(model) };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log("Usage: pnpm poc:tanstack [--live]\nDefault: scripted offline demo. Live: ANTHROPIC_API_KEY and ANTHROPIC_MODEL required.");
    return;
  }
  if (args.length > 1 || (args.length === 1 && args[0] !== "--live")) {
    throw new Error("Usage: pnpm poc:tanstack [--live]");
  }
  const mode = args[0] === "--live" ? "live" : "scripted";
  const result = await runPoc(mode === "live" ? liveAdapters() : demoAdapters());
  console.log(JSON.stringify({ mode, ...result }, null, 2));
  if (!result.passed) process.exitCode = 1;
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error ? error.message : "TanStack PoC failed");
  process.exitCode = 1;
}
