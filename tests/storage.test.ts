import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadTasks, saveTasks } from "../src/storage.js";

test("a missing store is empty and saved tasks round-trip", async () => {
  const directory = await mkdtemp(join(tmpdir(), "harness-bootstrap-"));
  const filePath = join(directory, "nested", "tasks.json");
  const tasks = [{ id: "1", title: "Test", tag: null, status: "open" as const }];

  assert.deepEqual(await loadTasks(filePath), []);
  await saveTasks(filePath, tasks);
  assert.deepEqual(await loadTasks(filePath), tasks);
});
