import { fileURLToPath } from "node:url";
import { agentCommand, agentUsage } from "./agent-session.js";

async function readInput(): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += bytes.length;
    if (size > 20000) throw new Error("Input exceeds 20000 bytes");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (!args.length || (args.length === 1 && args[0] === "--help")) {
    console.log(agentUsage);
    return;
  }
  const needsInput = args[0] === "write" || args[0] === "review";
  if (needsInput && process.stdin.isTTY) throw new Error("Provide JSON on stdin, for example with a heredoc");
  const input = needsInput ? await readInput() : "";
  const result = await agentCommand(fileURLToPath(new URL("../../.task-harness/agent-poc/", import.meta.url)), args, input);
  console.log(JSON.stringify(result, null, 2));
  const check = result.check;
  if (typeof check === "object" && check !== null && "passed" in check && check.passed === false) {
    process.exitCode = 1;
  }
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error ? error.message : "Agent PoC failed");
  process.exitCode = 1;
}
