import assert from "node:assert/strict";
import test from "node:test";

import { completeTask, createTask } from "../src/tasks.js";

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

test("completes the task with the requested ID without mutating the input", () => {
  const tasks = [
    { id: "TASK-1", title: "First", tag: null, status: "open" as const },
    { id: "TASK-2", title: "Second", tag: "demo", status: "open" as const },
  ];

  const completed = completeTask(tasks, "TASK-2");

  assert.equal(tasks[1]?.status, "open");
  assert.equal(completed[0]?.status, "open");
  assert.equal(completed[1]?.status, "completed");
});

test("rejects an unknown task ID", () => {
  assert.throws(() => completeTask([], "missing-id"), /Task not found: missing-id/);
});
