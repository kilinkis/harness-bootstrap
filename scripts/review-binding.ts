import { readFeatureQueue, type Feature } from "./feature-queue.js";
import { loadFinalReview } from "./final-review.js";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";

import { classifyDependencyMaintenance } from "./dependency-maintenance.js";
import { classifyLowRiskDocumentation } from "./low-risk-documentation.js";
import { resolveComparisonBase } from "./comparison-base.js";
import { classifyTrivialChange, readRiskyPaths, readStep } from "./trivial-change.js";

export interface ReviewBindingFinding {
  code: string;
  message: string;
  path?: string;
}

const QUEUE_DIAGNOSTIC_ALIASES: Record<string, string> = {
  QUEUE_READ_FAILED: "REVIEW_BINDING_QUEUE_INVALID",
  QUEUE_INVALID_JSON: "REVIEW_BINDING_QUEUE_INVALID",
  QUEUE_INVALID_SHAPE: "REVIEW_BINDING_QUEUE_INVALID",
  FEATURE_ISSUE_MISSING: "REVIEW_BINDING_ISSUE_MISSING",
  FEATURE_ISSUE_INVALID: "REVIEW_BINDING_ISSUE_MISSING",
};

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
  const features = await readFeatureQueue(root, findings);
  findings.forEach((finding) => {
    finding.code = QUEUE_DIAGNOSTIC_ALIASES[finding.code] ?? finding.code;
  });
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

function selectFeature(features: Feature[]): Feature | undefined {
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
  if (changed.length > 0 && (dependencyPaths.length === 0 ||
    await classifyDependencyMaintenance(root, anchor, dependencyPaths))) return true;
  return isEachStepWithoutWorkItem(root, anchor);
}

// Changes merged after the last approval are judged one default-branch step at a
// time, so separate trivial and maintenance merges do not add up to a refusal.
// Local commits after the comparison base and the staged index form one final
// step, as CI sees a request. Every step must need no work item.
async function isEachStepWithoutWorkItem(root: string, anchor: string): Promise<boolean> {
  const riskyPaths = await readRiskyPaths(root);
  const commits = (await readGit(root, ["rev-list", "--first-parent", "--ancestry-path", "--reverse", `${anchor}..HEAD`]))
    .split("\n").filter(Boolean);
  // Without a comparison base on the first-parent path (missing, unresolvable,
  // or merged into the branch), everything after the approval is one step.
  let target = anchor;
  try {
    const base = (await resolveComparisonBase(root)).commit;
    if (base && commits.includes(base)) target = base;
  } catch {
    target = anchor;
  }
  let previous = anchor;
  for (const commit of commits.slice(0, commits.indexOf(target) + 1)) {
    if (!await isStepWithoutWorkItem(root, previous, commit, riskyPaths)) return false;
    previous = commit;
  }
  return isStepWithoutWorkItem(root, previous, "", riskyPaths);
}

async function isStepWithoutWorkItem(
  root: string,
  base: string,
  head: string,
  riskyPaths: string[] | undefined,
): Promise<boolean> {
  const { changes, modeReasons } = await readStep(root, base, head);
  const paths = changes.map(({ path }) => path).filter(isImplementationPath);
  if (modeReasons.length > 0) return false;
  if (paths.length === 0 || classifyLowRiskDocumentation(paths).approved) return true;
  if (await classifyDependencyMaintenance(root, base, paths, head)) return true;
  return riskyPaths !== undefined && classifyTrivialChange(changes, riskyPaths).length === 0;
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
