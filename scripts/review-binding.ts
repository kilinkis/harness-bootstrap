import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { readGitChangedPaths } from "./git-changed-paths.js";
import { classifyLowRiskDocumentation } from "./low-risk-documentation.js";

export interface ReviewBindingFinding {
  code: string;
  message: string;
  path?: string;
}

interface QueueFeature {
  id: string;
  status: string;
  tracked: boolean;
}

interface IndexEntry {
  mode: string;
  objectId: string;
  path: string;
}

const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;

export async function computeImplementationDigest(root: string): Promise<string> {
  const entries = (await readIndex(root))
    .filter(({ path }) => isImplementationPath(path))
    .sort((left, right) => left.path.localeCompare(right.path));
  const hash = createHash("sha256");
  hash.update("harness-review-scope-v1\0");
  for (const entry of entries) {
    hash.update(`${entry.mode}\0${entry.objectId}\0${entry.path}\0`);
  }
  return `sha256:${hash.digest("hex")}`;
}

export async function validateReviewBinding(
  root: string,
  base = "origin/main",
): Promise<ReviewBindingFinding[]> {
  const findings: ReviewBindingFinding[] = [];
  const features = await readQueue(root, findings);
  if (!features) return findings;
  const selected = await selectFeature(root, base, features);
  if (!selected) return findings;

  const reportPath = `progress/review_${selected.id}.md`;
  let report: string;
  try {
    report = await readFile(resolve(root, reportPath), "utf8");
  } catch {
    addFinding(
      findings,
      "REVIEW_BINDING_MISSING",
      `${selected.id}: review report does not contain an implementation digest`,
      reportPath,
    );
    return findings;
  }

  const declaration = /^Implementation digest:\s*(.*?)\s*$/m.exec(report);
  if (!declaration?.[1]) {
    addFinding(
      findings,
      "REVIEW_BINDING_MISSING",
      `${selected.id}: review report does not contain an implementation digest`,
      reportPath,
    );
    return findings;
  }
  if (!DIGEST_PATTERN.test(declaration[1])) {
    addFinding(
      findings,
      "REVIEW_BINDING_INVALID",
      `${selected.id}: implementation digest must use sha256 and 64 lowercase hex characters`,
      reportPath,
    );
    return findings;
  }

  const current = await computeImplementationDigest(root);
  if (declaration[1] !== current) {
    addFinding(
      findings,
      "REVIEW_BINDING_STALE",
      `${selected.id}: staged implementation changed after review`,
      reportPath,
    );
  }
  return findings;
}

async function selectFeature(
  root: string,
  base: string,
  features: QueueFeature[],
): Promise<QueueFeature | undefined> {
  const active = features.find(({ status }) =>
    status === "in_progress" || status === "in_review"
  );
  if (active) return active.status === "in_review" ? active : undefined;
  const completed = [...features].reverse().find(({ status, tracked }) =>
    status === "done" && tracked
  );
  if (!completed) return undefined;
  const changed = await readGitChangedPaths(root, base);
  return classifyLowRiskDocumentation(changed).approved ? undefined : completed;
}

async function readQueue(
  root: string,
  findings: ReviewBindingFinding[],
): Promise<QueueFeature[] | undefined> {
  try {
    const value = JSON.parse(
      await readFile(resolve(root, "feature_list.json"), "utf8"),
    ) as unknown;
    if (!Array.isArray(value)) throw new Error("invalid queue");
    return value.flatMap((item) => {
      if (!isRecord(item) || typeof item.id !== "string" ||
        typeof item.status !== "string") return [];
      return [{
        id: item.id,
        status: item.status,
        tracked: typeof item.issue === "string" && item.issue.trim() !== "",
      }];
    });
  } catch {
    addFinding(
      findings,
      "REVIEW_BINDING_QUEUE_INVALID",
      "Cannot read a valid feature queue for review binding",
      "feature_list.json",
    );
    return undefined;
  }
}

function readIndex(root: string): Promise<IndexEntry[]> {
  return new Promise((resolveEntries, reject) => {
    execFile(
      "git",
      ["ls-files", "--stage", "-z"],
      { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(new Error(`Cannot read the staged Git snapshot: ${error.message}`));
          return;
        }
        resolveEntries(parseIndex(stdout));
      },
    );
  });
}

function parseIndex(output: string): IndexEntry[] {
  return output.split("\0").flatMap((record) => {
    if (!record) return [];
    const match = /^(\d+) ([a-f0-9]+) 0\t([\s\S]+)$/.exec(record);
    return match?.[1] && match[2] && match[3]
      ? [{ mode: match[1], objectId: match[2], path: match[3] }]
      : [];
  });
}

function isImplementationPath(path: string): boolean {
  return path !== "feature_list.json" && !path.startsWith("progress/");
}

function addFinding(
  findings: ReviewBindingFinding[],
  code: string,
  message: string,
  path?: string,
): void {
  findings.push({ code, message, ...(path ? { path } : {}) });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
