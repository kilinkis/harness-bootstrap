import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { addFinding, containsFeatureId, type HarnessFinding } from "./harness-state-support.js";
import { readBootstrapHistory } from "./bootstrap-history.js";

export async function resolveFinalReviewPath(root: string, featureId: string): Promise<string> {
  const canonicalPath = `progress/review_${featureId}.md`;
  const { reviews } = await readBootstrapHistory(root);
  const historical = Object.hasOwn(reviews, featureId) ? reviews[featureId] : undefined;
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
  const findings: HarnessFinding[] = [];
  let path: string;
  try { path = await resolveFinalReviewPath(root, featureId); }
  catch (error) {
    addFinding(findings, "BOOTSTRAP_HISTORY_INVALID", String(error), "harness.bootstrap-history.json");
    return { path: `progress/review_${featureId}.md`, findings };
  }
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
