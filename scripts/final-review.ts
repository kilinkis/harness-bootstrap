import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { addFinding, containsFeatureId, type HarnessFinding } from "./harness-state-support.js";

interface HistoricalReview {
  suffix: string;
  originalHash: string;
  finalHash: string;
}

// Preserve the four final approvals written before canonical-only review validation.
// Both files must match their historical bytes; new work cannot inherit an exception.
const HISTORICAL_REVIEWS: Record<string, HistoricalReview> = {
  "TASK-005": {
    suffix: "_followup",
    originalHash: "b99fd6a4a21848aecd63225f405064d95a6bd101f18854050ccdacaede592133",
    finalHash: "75b7e6cf0bc6ec4df49780e10d072d8c9d9281fbd5e13ee08b1d071f76921a44",
  },
  "TASK-009": {
    suffix: "_followup",
    originalHash: "094f6c1a16adc2ec9328293f69e6e88456218f690f42ab09c08e9f9de6e3fc73",
    finalHash: "2cb468de2e5a7a0b4cc8e3153105c008e76d7c239cf558ec74fadfa1e8865160",
  },
  "TASK-011": {
    suffix: "_followup",
    originalHash: "75700a3c612c154aa97ca17dd746aa2847a66133cc45232db721d261b5a62512",
    finalHash: "094b889ccce0730f5f1f6e7a746d8119792a5d69ebe6de2b5aebeab4ffd9ee4c",
  },
  "TASK-022": {
    suffix: "_round1",
    originalHash: "bc7f6dc5d6c1e71e1401e67954ed47db0997e41830648b8197b4ec0437c5cad6",
    finalHash: "23a1e99ea5cc6d1336609f85ffd4f57fddcc824207a23f5fa3e0fb8f0edfc324",
  },
};

export async function resolveFinalReviewPath(root: string, featureId: string): Promise<string> {
  const canonicalPath = `progress/review_${featureId}.md`;
  const historical = HISTORICAL_REVIEWS[featureId];
  if (!historical) return canonicalPath;
  const historicalPath = `progress/review_${featureId}${historical.suffix}.md`;
  try {
    const [originalHash, finalHash] = await Promise.all(
      [canonicalPath, historicalPath].map(async (path) =>
        createHash("sha256").update(await readFile(resolve(root, path))).digest("hex")
      ),
    );
    if (originalHash === historical.originalHash && finalHash === historical.finalHash) {
      return historicalPath;
    }
  } catch {
    // Missing historical evidence cannot authorize an alternate final report.
  }
  return canonicalPath;
}

interface ReviewSection {
  name: string;
  body: string[];
}

interface ReviewContent {
  sections: ReviewSection[];
  verdicts: string[];
  digests: string[];
  lines: string[];
}

export async function loadFinalReview(root: string, featureId: string): Promise<{
  path: string;
  report?: string;
  digest?: string;
  findings: HarnessFinding[];
}> {
  const path = await resolveFinalReviewPath(root, featureId);
  const findings: HarnessFinding[] = [];
  let report: string;
  try {
    report = await readFile(resolve(root, path), "utf8");
  } catch {
    addFinding(findings, "REVIEW_REPORT_MISSING", `Cannot read ${path}`, path);
    return { path, findings };
  }
  const content = readReviewContent(report);
  if (!containsFeatureId(report, featureId)) {
    addFinding(findings, "REPORT_FEATURE_MISSING", `${path}: report must identify ${featureId}`, path);
  }
  validateApproval(content, featureId, path, findings);
  validateEvidence(content, path, path !== `progress/review_${featureId}.md`, findings);
  const digest = content.digests[0];
  if (content.digests.length > 1 || (digest !== undefined && !/^sha256:[a-f0-9]{64}$/.test(digest))) {
    addFinding(findings, "REVIEW_BINDING_INVALID", `${featureId}: declare one sha256 digest with 64 lowercase hex characters`, path);
  }
  return { path, report, digest, findings };
}

// Recognize the documented report fields, not a general Markdown document model.
// Fenced examples are evidence content but cannot declare headings or approval.
function reviewLines(report: string): { text: string; structural: boolean }[] {
  const lines: { text: string; structural: boolean }[] = [];
  let fence = "";
  for (const text of report.replace(/<!--[\s\S]*?(?:-->|$)/g, "").split(/\r?\n/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(text);
    if (fence) {
      if (marker?.[1]?.startsWith(fence) && !marker[2]?.trim()) {
        fence = "";
      } else lines.push({ text, structural: false });
    } else if (marker) fence = marker[1] ?? "";
    else lines.push({ text, structural: !/^(?: {4}|\t| {0,3}>)/.test(text) });
  }
  return lines;
}

function readReviewContent(report: string): ReviewContent {
  const content: ReviewContent = { sections: [], verdicts: [], digests: [], lines: [] };
  let current: ReviewSection | undefined;
  for (const { text, structural } of reviewLines(report)) {
    if (!structural) {
      if (current?.name !== "verdict") current?.body.push(text);
      continue;
    }
    content.lines.push(text);
    const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(text);
    if (heading) {
      current = selectSection(content, current, heading);
      continue;
    }
    if (!readDeclaration(content, text.trim())) current?.body.push(text);
  }
  content.verdicts.push(...content.sections.filter(({ name }) => name === "verdict")
    .map(({ body }) => body.join("\n").trim()));
  return content;
}

function selectSection(content: ReviewContent, current: ReviewSection | undefined, heading: RegExpExecArray): ReviewSection | undefined {
  if (heading[1] === "#") return undefined;
  if (heading[1] !== "##") return current;
  const section = { name: (heading[2] ?? "").toLowerCase(), body: [] };
  content.sections.push(section);
  return section;
}

function readDeclaration(content: ReviewContent, text: string): boolean {
  const verdict = /^Verdict:[ \t]*(.*)$/i.exec(text);
  if (verdict) {
    content.verdicts.push((verdict[1] ?? "").replace(/^`(.*)`$/, "$1"));
    return true;
  }
  const digest = /^Implementation digest:[ \t]*(.*)$/.exec(text);
  if (!digest) return false;
  content.digests.push((digest[1] ?? "").trim());
  return true;
}

function validateApproval(content: ReviewContent, featureId: string, path: string, findings: HarnessFinding[]): void {
  const verdict = content.verdicts[0] ?? "";
  if (content.verdicts.length !== 1 || !/^approved(?:\.(?:\s|$)|$)/i.test(verdict) ||
    /\b(?:changes requested|not approved|rejected)\b/i.test(verdict)) {
    addFinding(findings, "REVIEW_APPROVAL_MISSING", `${featureId}: final review needs one unambiguous approved verdict`, path);
  }
}

function validateEvidence(content: ReviewContent, path: string, historical: boolean, findings: HarnessFinding[]): void {
  const groups = [
    ["scope reviewed", "findings", "review", "review axes"],
    ["commands and results", "independent verification"],
    ["remaining risks", "remaining risk", "remaining risks or resolution", "next step"],
  ];
  for (const names of groups) {
    const sections = content.sections.filter(({ name }) => names.includes(name));
    if (historical && names[0] === "remaining risks" && sections.length === 0 &&
      content.lines.some((line) => line.trim() === "No unresolved findings remain.")) continue;
    if (sections.length === 0 || sections.some(({ body }) => !body.join("\n").trim())) {
      addFinding(findings, "REPORT_SECTION_MISSING", `${path}: missing or empty ${names[0]} evidence`, path);
    }
  }
}
