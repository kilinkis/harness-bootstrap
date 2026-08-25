/** Atomic JSON persistence for the demo task store. */

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { Task } from "./tasks.js";

export async function loadTasks(filePath: string): Promise<Task[]> {
  try {
    const data: unknown = JSON.parse(await readFile(filePath, "utf8"));
    if (!Array.isArray(data)) {
      throw new Error("Task store must contain a JSON array");
    }
    return data as Task[];
  } catch (error: unknown) {
    if (isMissingFile(error)) {
      return [];
    }
    throw error;
  }
}

export async function saveTasks(filePath: string, tasks: Task[]): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

function isMissingFile(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
