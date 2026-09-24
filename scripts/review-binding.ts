import { isLegacyBootstrapFeature } from "./legacy-bootstrap.js";
import { loadFinalReview } from "./final-review.js";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { classifyDependencyMaintenance } from "./dependency-maintenance.js";
import { classifyLowRiskDocumentation } from "./low-risk-documentation.js";

export interface ReviewBindingFinding {
  code: string;
  message: string;
  path?: string;
}

interface QueueFeature {
  id: string;
  status: string;
  legacy: boolean;
}

interface IndexEntry {
  mode: string;
  objectId: string;
  path: string;
}

export async function computeImplementationDigest(root: string): Promise<string> {
  return digestEntries(await readSnapshot(root));
}

export async function assertDeliverySnapshot(root: string): Promise<void> {
  const paths = (await readGit(root, ["-c", "core.fileMode=true", "diff", "--no-ext-diff",
    "--no-textconv", "--ignore-submodules=none", "--no-renames", "--name-only", "-z", "--"]))
    .split("\0").filter((path) => path && isImplementationPath(path));
  if (paths.length > 0) {
    throw new Error("DELIVERY_SNAPSHOT_MISMATCH: tracked implementation differs from the reviewed index: " +
      paths.map((path) => JSON.stringify(path)).join(", ") +
      ". Reconcile the working tree with the intended snapshot, then stage and obtain review for changed implementation.");
  }
}

function digestEntries(snapshot: IndexEntry[]): string {
  const entries = snapshot
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
): Promise<ReviewBindingFinding[]> {
  const findings: ReviewBindingFinding[] = [];
  const features = await readQueue(root, findings);
  if (!features || findings.length > 0) return findings;
  const selected = selectFeature(features);
  if (!selected) return findings;

  const review = await loadFinalReview(root, selected.id);
  const { path: reportPath, report, digest } = review;
  const digestFailure = review.findings.find(({ code }) =>
    code === "REVIEW_REPORT_MISSING" || code === "REVIEW_BINDING_INVALID");
  if (digestFailure) return [{ ...digestFailure, code: digestFailure.code === "REVIEW_REPORT_MISSING"
    ? "REVIEW_BINDING_MISSING" : digestFailure.code }];
  if (report === undefined || digest === undefined) {
    addFinding(findings, "REVIEW_BINDING_MISSING",
      `${selected.id}: review report does not contain an implementation digest`, reportPath);
    return findings;
  }
  findings.push(...review.findings);
  if (findings.length > 0) return findings;

  const current = await computeImplementationDigest(root);
  if (digest === current) return findings;
  if (selected.status === "done") {
    try {
      if (await isReviewedMaintenance(root, reportPath, report, digest)) return findings;
    } catch {
      addFinding(findings, "REVIEW_BINDING_BASELINE_INVALID",
        `${selected.id}: cannot verify the committed review baseline; fetch full history and check the canonical report`,
        reportPath);
      return findings;
    }
  }
  addFinding(findings, "REVIEW_BINDING_STALE",
    `${selected.id}: staged implementation changed after review`, reportPath);
  return findings;
}

function selectFeature(features: QueueFeature[]): QueueFeature | undefined {
  const active = features.find(({ status }) =>
    status === "in_progress" || status === "in_review"
  );
  if (active) return active.status === "in_review" ? active : undefined;
  return [...features].reverse().find(({ status, legacy }) =>
    status === "done" && !legacy
  );
}

async function isReviewedMaintenance(
  root: string,
  reportPath: string,
  report: string,
  digest: string,
): Promise<boolean> {
  const anchor = (await readGit(root, ["log", "-1", "--format=%H", "HEAD", "--", reportPath])).trim();
  if (!anchor) throw new Error("No committed canonical review");
  const [committedReport, snapshot] = await Promise.all([
    readGit(root, ["show", `${anchor}:${reportPath}`]),
    readSnapshot(root, anchor),
  ]);
  if (committedReport !== report || digestEntries(snapshot) !== digest) {
    throw new Error("The canonical report does not bind its committed implementation");
  }
  const changed = (await readGit(root, ["diff", "--cached", "--no-renames", "--name-only", "-z", anchor, "--"]))
    .split("\0").filter((path) => path && isImplementationPath(path));
  const dependencyPaths = classifyLowRiskDocumentation(changed).refusedPaths;
  return changed.length > 0 && (dependencyPaths.length === 0 ||
    await classifyDependencyMaintenance(root, anchor, dependencyPaths));
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
      const legacy = isLegacyBootstrapFeature(item);
      if (item.status === "done" && !legacy && (typeof item.issue !== "string" || !item.issue.trim())) {
        addFinding(findings, "REVIEW_BINDING_ISSUE_MISSING",
          `${item.id}: completed work needs a local or remote work-item reference`, "feature_list.json");
      }
      return [{
        id: item.id,
        status: item.status,
        legacy,
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

async function readSnapshot(root: string, revision?: string): Promise<IndexEntry[]> {
  const output = await readGit(root, revision
    ? ["ls-tree", "-r", "-z", revision]
    : ["ls-files", "--stage", "-z"]);
  return output.split("\0").flatMap((record) => {
    const match = /^(\d+) (?:(?:blob|commit) )?([a-f0-9]+)(?: 0)?\t([\s\S]+)$/.exec(record);
    return match?.[1] && match[2] && match[3]
      ? [{ mode: match[1], objectId: match[2], path: match[3] }]
      : [];
  });
}

function readGit(root: string, args: string[]): Promise<string> {
  return new Promise((resolveOutput, reject) => {
    execFile("git", args, { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
      (error, stdout) => {
        if (error) reject(new Error(`Cannot read the Git snapshot: ${error.message}`));
        else resolveOutput(stdout);
      });
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
