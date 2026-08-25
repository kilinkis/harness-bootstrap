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
