import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface HarnessFinding {
  code: string;
  message: string;
  path?: string;
}

export interface Feature {
  id: string;
  status: string;
  tracked: boolean;
}

export async function readText(
  root: string,
  path: string,
  code: string,
  findings: HarnessFinding[],
): Promise<string | undefined> {
  try {
    return await readFile(resolve(root, path), "utf8");
  } catch {
    addFinding(findings, code, `Cannot read ${path}`, path);
    return undefined;
  }
}

export function addFinding(
  findings: HarnessFinding[],
  code: string,
  message: string,
  path?: string,
): void {
  findings.push({ code, message, ...(path ? { path } : {}) });
}

export function containsFeatureId(text: string, featureId: string): boolean {
  const escaped = featureId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9._-])${escaped}(?=$|[^A-Za-z0-9._-])`, "m").test(text);
}
