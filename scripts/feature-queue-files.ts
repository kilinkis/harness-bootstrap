import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { addFinding, readText, type HarnessFinding } from "./harness-state-support.js";

export interface QueueFile {
  path: string;
  archived: boolean;
  entries: unknown[];
}

export async function readFeatureQueueFiles(root: string, findings: HarnessFinding[]): Promise<QueueFile[] | undefined> {
  const archivePath = "progress/feature-history";
  let names: string[] = [];
  try {
    const entries = await readdir(resolve(root, archivePath), { withFileTypes: true });
    if (entries.some((entry) => !entry.isFile() || !/^\d{3}\.json$/.test(entry.name))) {
      throw new Error("Archive entries must be regular files named NNN.json");
    }
    names = entries.map(({ name }) => name).sort();
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      addFinding(findings, "QUEUE_ARCHIVE_READ_FAILED", String(error), archivePath);
      return undefined;
    }
  }
  const paths = [...names.map((name) => `${archivePath}/${name}`), "feature_list.json"];
  const files: QueueFile[] = [];
  for (const path of paths) {
    const text = await readText(root, path, "QUEUE_READ_FAILED", findings);
    if (text === undefined) return undefined;
    let entries: unknown;
    try { entries = JSON.parse(text) as unknown; }
    catch {
      addFinding(findings, "QUEUE_INVALID_JSON", "Feature queue is not valid JSON", path);
      return undefined;
    }
    if (!Array.isArray(entries)) {
      addFinding(findings, "QUEUE_INVALID_SHAPE", "Feature queue must be an array", path);
      return undefined;
    }
    files.push({ path, archived: path !== "feature_list.json", entries: entries as unknown[] });
  }
  return files;
}
