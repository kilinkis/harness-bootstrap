import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { run } from "../src/cli.js";

test("adds and lists a task", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harness-bootstrap-"));
  const store = join(directory, "tasks.json");
  const output: string[] = [];

  assert.equal(await run(["--store", store, "add", "Plan demo", "--tag", "ai"], output.push.bind(output)), 0);
  assert.equal(await run(["--store", store, "list"], output.push.bind(output)), 0);

  assert.match(output[0], /^Created /);
  assert.match(output[1], /open  Plan demo \[ai\]$/);
});

test("reports an empty task store clearly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harness-bootstrap-"));
  const output: string[] = [];

  assert.equal(await run(["--store", join(directory, "tasks.json"), "list"], output.push.bind(output)), 0);
  assert.deepEqual(output, ["No tasks yet."]);
});

test("completes a persisted task", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harness-bootstrap-"));
  const store = join(directory, "tasks.json");
  const output: string[] = [];

  await run(["--store", store, "add", "Demonstrate the harness"], output.push.bind(output));
  const taskId = output[0]?.match(/^Created ([^:]+):/)?.[1];
  assert.ok(taskId);

  assert.equal(await run(["--store", store, "complete", taskId], output.push.bind(output)), 0);
  const persisted = JSON.parse(await readFile(store, "utf8")) as Array<{ id: string; status: string }>;

  assert.equal(output[1], `Completed ${taskId}`);
  assert.equal(persisted.find((task) => task.id === taskId)?.status, "completed");
});

test("reports an unknown task ID with a non-zero result", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harness-bootstrap-"));
  const errors: string[] = [];

  const result = await run(
    ["--store", join(directory, "tasks.json"), "complete", "missing-id"],
    () => undefined,
    errors.push.bind(errors),
  );

  assert.equal(result, 1);
  assert.deepEqual(errors, ["Error: Task not found: missing-id"]);
});
