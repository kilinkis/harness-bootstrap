import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

import {
  addFinding,
  containsFeatureId,
  readText,
  type Feature,
  type HarnessFinding,
} from "./harness-state-support.js";

interface ReportSection {
  name: string;
  patterns: RegExp[];
}

const IMPLEMENTATION_SECTIONS: ReportSection[] = [
  { name: "Scope", patterns: [/^## Scope\s*$/im] },
  {
    name: "Files changed or inspected",
    patterns: [/^## Files (?:changed|inspected|changed or inspected)\s*$/im],
  },
  {
    name: "Commands and results",
    patterns: [/^## (?:Commands and results|Evidence)\s*$/im],
  },
  {
    name: "Remaining risks",
    patterns: [/^## (?:Remaining risks|Risks)\s*$/im],
  },
];

const REVIEW_SECTIONS: ReportSection[] = [
  { name: "Verdict", patterns: [/\bVerdict\b/i] },
  {
    name: "Scope or findings",
    patterns: [/^## (?:Scope reviewed|Findings|Review|Review axes)\s*$/im],
  },
  {
    name: "Commands and results",
    patterns: [/^## (?:Commands and results|Independent verification)\s*$/im],
  },
  {
    name: "Remaining risks or resolution",
    patterns: [
      /^## (?:Remaining risks?|Next step)\s*$/im,
      /No unresolved findings remain\./i,
    ],
  },
];

export async function validateFeatureEvidence(
  root: string,
  features: Feature[],
  findings: HarnessFinding[],
): Promise<void> {
  const completedTracked = features.filter(
    ({ status, tracked }) => status === "done" && tracked,
  );
  const needsImplementation = features.filter(
    ({ status, tracked }) => status === "in_review" || (status === "done" && tracked),
  );

  for (const feature of needsImplementation) {
    const path = `progress/impl_${feature.id}.md`;
    const report = await readText(root, path, "IMPLEMENTATION_REPORT_MISSING", findings);
    if (report !== undefined) {
      validateReport(report, path, feature.id, IMPLEMENTATION_SECTIONS, findings);
    }
  }

  const progressFiles = completedTracked.length
    ? await readDirectory(root, "progress", findings)
    : [];
  for (const feature of completedTracked) {
    await validateCompletedReview(root, progressFiles, feature.id, findings);
  }
  await validateHistory(root, completedTracked, findings);
}

async function validateCompletedReview(
  root: string,
  progressFiles: string[],
  featureId: string,
  findings: HarnessFinding[],
): Promise<void> {
  const prefix = `review_${featureId}`;
  const reportFiles = progressFiles.filter(
    (file) =>
      file === `${prefix}.md` ||
      (file.startsWith(`${prefix}_`) && file.endsWith(".md")),
  );
  if (reportFiles.length === 0) {
    addFinding(
      findings,
      "REVIEW_REPORT_MISSING",
      `${featureId}: completed tracked feature needs a review report`,
      "progress",
    );
    return;
  }

  const reports: string[] = [];
  for (const file of reportFiles) {
    const path = `progress/${file}`;
    const report = await readText(root, path, "REVIEW_REPORT_MISSING", findings);
    if (report !== undefined) {
      reports.push(report);
      validateFeatureIdentity(report, path, featureId, findings);
    }
  }
  const combined = reports.join("\n");
  validateSections(combined, `progress/${prefix}*.md`, REVIEW_SECTIONS, findings);
  if (!reports.some(hasApprovedVerdict)) {
    addFinding(
      findings,
      "REVIEW_APPROVAL_MISSING",
      `${featureId}: completed tracked feature needs an approved review verdict`,
      `progress/${prefix}*.md`,
    );
  }
}

function hasApprovedVerdict(report: string): boolean {
  const inlineVerdict = /^Verdict:\s*`?approved`?\s*$/im;
  const sectionVerdict = /^## Verdict[ \t]*\r?\n(?:[ \t]*\r?\n)*Approved(?:\.|[ \t]*$)/im;
  return inlineVerdict.test(report) || sectionVerdict.test(report);
}

async function validateHistory(
  root: string,
  features: Feature[],
  findings: HarnessFinding[],
): Promise<void> {
  if (features.length === 0) return;
  const path = "progress/history.md";
  const history = await readText(root, path, "HISTORY_MISSING", findings);
  if (history === undefined) return;
  for (const feature of features) {
    if (!containsFeatureId(history, feature.id)) {
      addFinding(
        findings,
        "HISTORY_ENTRY_MISSING",
        `${feature.id}: completed tracked feature is missing from history`,
        path,
      );
    }
  }
}

function validateReport(
  report: string,
  path: string,
  featureId: string,
  sections: ReportSection[],
  findings: HarnessFinding[],
): void {
  validateFeatureIdentity(report, path, featureId, findings);
  validateSections(report, path, sections, findings);
}

function validateFeatureIdentity(
  report: string,
  path: string,
  featureId: string,
  findings: HarnessFinding[],
): void {
  if (!containsFeatureId(report, featureId)) {
    addFinding(findings, "REPORT_FEATURE_MISSING", `${path}: report must identify ${featureId}`, path);
  }
}

function validateSections(
  report: string,
  path: string,
  sections: ReportSection[],
  findings: HarnessFinding[],
): void {
  for (const section of sections) {
    if (!section.patterns.some((pattern) => pattern.test(report))) {
      addFinding(
        findings,
        "REPORT_SECTION_MISSING",
        `${path}: missing ${section.name} evidence`,
        path,
      );
    }
  }
}

async function readDirectory(
  root: string,
  path: string,
  findings: HarnessFinding[],
): Promise<string[]> {
  try {
    return await readdir(resolve(root, path));
  } catch {
    addFinding(findings, "PROGRESS_DIRECTORY_MISSING", "Progress directory is missing", path);
    return [];
  }
}
