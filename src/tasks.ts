/** Task domain operations. */

import { randomUUID } from "node:crypto";

export type TaskStatus = "open" | "completed";

export interface Task {
  id: string;
  title: string;
  tag: string | null;
  status: TaskStatus;
}

export function createTask(title: string, tag?: string): Task {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) {
    throw new Error("Task title cannot be empty");
  }

  const normalizedTag = tag?.trim();
  return {
    id: randomUUID(),
    title: normalizedTitle,
    tag: normalizedTag || null,
    status: "open",
  };
}

export function completeTask(tasks: readonly Task[], taskId: string): Task[] {
  let matched = false;
  const updatedTasks = tasks.map((task) => {
    if (task.id !== taskId) return task;
    matched = true;
    return { ...task, status: "completed" as const };
  });

  if (!matched) {
    throw new Error(`Task not found: ${taskId}`);
  }

  return updatedTasks;
}
