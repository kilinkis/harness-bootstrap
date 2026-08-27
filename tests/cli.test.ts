import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { run } from "../src/cli.js";

void test("adds and lists a task", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harness-bootstrap-"));
  const store = join(directory, "tasks.json");
  const output: string[] = [];

  assert.equal(await run(["--store", store, "add", "Plan demo", "--tag", "ai"], output.push.bind(output)), 0);
  assert.equal(await run(["--store", store, "list"], output.push.bind(output)), 0);

  assert.match(output[0], /^Created /);
  assert.match(output[1], /open {2}Plan demo \[ai\]$/);
});

void test("reports an empty task store clearly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harness-bootstrap-"));
  const output: string[] = [];

  assert.equal(await run(["--store", join(directory, "tasks.json"), "list"], output.push.bind(output)), 0);
  assert.deepEqual(output, ["No tasks yet."]);
});

void test("rejects malformed add options with a useful error", async () => {
  const output: string[] = [];
  const errors: string[] = [];

  assert.equal(
    await run(["add", "Plan demo", "--tag"], output.push.bind(output), errors.push.bind(errors)),
    1,
  );
  assert.deepEqual(output, []);
  assert.deepEqual(errors, ["Error: Usage: add <title> [--tag <tag>]"]);
});
