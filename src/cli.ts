/** Command-line interface for the task demo. */

import { loadTasks, saveTasks } from "./storage.js";
import { completeTask, createTask } from "./tasks.js";

type WriteLine = (message: string) => void;

type Command =
  | { name: "add"; title: string; tag?: string; store: string }
  | { name: "complete"; taskId: string; store: string }
  | { name: "list"; store: string };

export async function run(
  arguments_: string[],
  write: WriteLine = console.log,
  writeError: WriteLine = console.error,
): Promise<number> {
  try {
    const command = parseArguments(arguments_);
    const tasks = await loadTasks(command.store);

    if (command.name === "add") {
      const task = createTask(command.title, command.tag);
      tasks.push(task);
      await saveTasks(command.store, tasks);
      write(`Created ${task.id}: ${task.title}`);
      return 0;
    }

    if (command.name === "complete") {
      const updatedTasks = completeTask(tasks, command.taskId);
      await saveTasks(command.store, updatedTasks);
      write(`Completed ${command.taskId}`);
      return 0;
    }

    if (tasks.length === 0) {
      write("No tasks yet.");
      return 0;
    }

    for (const task of tasks) {
      const tag = task.tag ? ` [${task.tag}]` : "";
      write(`${task.id}  ${task.status}  ${task.title}${tag}`);
    }
    return 0;
  } catch (error: unknown) {
    writeError(`Error: ${messageFor(error)}`);
    return 1;
  }
}

function parseArguments(arguments_: string[]): Command {
  const remaining = [...arguments_];
  let store = process.env.TASK_HARNESS_STORE ?? ".task-harness/tasks.json";

  const storeIndex = remaining.indexOf("--store");
  if (storeIndex !== -1) {
    const value = remaining[storeIndex + 1];
    if (!value) throw new Error("--store requires a path");
    store = value;
    remaining.splice(storeIndex, 2);
  }

  const name = remaining.shift();
  if (name === "list" && remaining.length === 0) return { name, store };
  if (name === "complete") {
    const taskId = remaining.shift();
    if (!taskId || remaining.length !== 0) {
      throw new Error("Usage: complete <task-id>");
    }
    return { name, taskId, store };
  }
  if (name === "add") {
    const title = remaining.shift();
    const tagIndex = remaining.indexOf("--tag");
    const tag = tagIndex === -1 ? undefined : remaining[tagIndex + 1];
    if (!title || (tagIndex !== -1 && !tag) || (tagIndex !== -1 && remaining.length !== 2)) {
      throw new Error("Usage: add <title> [--tag <tag>]");
    }
    if (tagIndex === -1 && remaining.length !== 0) throw new Error("Usage: add <title> [--tag <tag>]");
    return { name, title, tag, store };
  }
  throw new Error("Usage: [--store <path>] <add|complete|list>");
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (import.meta.main) {
  process.exitCode = await run(process.argv.slice(2));
}
