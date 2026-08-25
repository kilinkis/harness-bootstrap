import assert from "node:assert/strict";
import test from "node:test";

import { createTask } from "../src/tasks.js";

test("creates an open task with trimmed values", () => {
  const task = createTask("  Write case study  ", "  portfolio ");
  assert.equal(task.title, "Write case study");
  assert.equal(task.tag, "portfolio");
  assert.equal(task.status, "open");
  assert.ok(task.id);
});

test("rejects an empty task title", () => {
  assert.throws(() => createTask("  "), /cannot be empty/);
});
