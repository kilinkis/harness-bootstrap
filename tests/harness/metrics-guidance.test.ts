import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const REPOSITORY_ROOT = new URL("../../", import.meta.url);

void test("metrics guidance defines storage, privacy, and evidence limits", async () => {
  const guide = await readRepositoryFile("docs/workflow-metrics.md");
  const verification = await readRepositoryFile("docs/verification.md");

  assert.match(verification, /workflow metrics/i);
  assert.match(guide, /\.task-harness\/metrics\.jsonl/);
  assert.match(guide, /HARNESS_METRICS_FILE/);
  assert.match(guide, /bounds each encoded event to 4 KiB/i);
  assert.match(guide, /lock acquisition stops after five seconds/i);
  assert.match(guide, /retention period/i);
  assert.match(guide, /caller-supplied estimate/i);
  assert.match(guide, /Number\.MAX_SAFE_INTEGER/);
  assert.match(guide, /summary aggregation rejects/i);
  assert.match(guide, /canonical UTC form/);
  assert.match(guide, /prompts, source content, command arguments, secrets/i);
  assert.match(guide, /not authenticated/i);
  assert.match(guide, /does not replace CI logs/i);
});

void test("the versioned schema excludes free-form content", async () => {
  const schema = JSON.parse(
    await readRepositoryFile("workflow-metrics.schema.json"),
  ) as { title?: string; $defs?: Record<string, unknown> };
  const text = JSON.stringify(schema);

  assert.match(schema.title ?? "", /version 1/i);
  assert.ok(schema.$defs?.gate);
  assert.ok(schema.$defs?.agentRun);
  assert.doesNotMatch(text, /prompt|commandArgs|sourceContent|secret/i);
});

async function readRepositoryFile(path: string): Promise<string> {
  return readFile(new URL(path, REPOSITORY_ROOT), "utf8");
}
