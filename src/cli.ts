/** Command-line interface for the task demo. */

import { loadTasks, saveTasks } from "./storage.js";
import { createTask } from "./tasks.js";

type WriteLine = (message: string) => void;

const ADD_USAGE = "Usage: add <title> [--tag <tag>]";
const COMMAND_USAGE = "Usage: [--store <path>] <add|list>";

interface Command {
  name: "add" | "list";
  title?: string;
  tag?: string;
  store: string;
}

export async function run(
  arguments_: string[],
  write: WriteLine = console.log,
  writeError: WriteLine = console.error,
): Promise<number> {
  try {
    const command = parseArguments(arguments_);
    const tasks = await loadTasks(command.store);

    if (command.name === "add") {
      const task = createTask(command.title ?? "", command.tag);
      tasks.push(task);
      await saveTasks(command.store, tasks);
      write(`Created ${task.id}: ${task.title}`);
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
  const { remaining, store } = extractStore(arguments_);
  const name = remaining.shift();

  if (name === "list" && remaining.length === 0) return { name, store };
  if (name === "add") return parseAdd(remaining, store);
  throw new Error(COMMAND_USAGE);
}

function extractStore(arguments_: string[]): { remaining: string[]; store: string } {
  const remaining = [...arguments_];
  let store = process.env.TASK_HARNESS_STORE ?? ".task-harness/tasks.json";

  const storeIndex = remaining.indexOf("--store");
  if (storeIndex !== -1) {
    const value = remaining[storeIndex + 1];
    if (!value) throw new Error("--store requires a path");
    store = value;
    remaining.splice(storeIndex, 2);
  }

  return { remaining, store };
}

function parseAdd(remaining: string[], store: string): Command {
  const [title, ...options] = remaining;
  if (!title) throw new Error(ADD_USAGE);
  if (options.length === 0) return { name: "add", title, store };
  if (options.length === 2 && options[0] === "--tag" && options[1]) {
    return { name: "add", title, tag: options[1], store };
  }
  throw new Error(ADD_USAGE);
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (import.meta.main) {
  process.exitCode = await run(process.argv.slice(2));
}
