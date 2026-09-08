import type { AdoptionFinding } from "./adoption-audit-types.js";

export function addFinding(
  findings: AdoptionFinding[],
  code: string,
  message: string,
  path?: string,
): void {
  findings.push({ code, message, ...(path ? { path } : {}) });
}

export function compareFindings(
  left: AdoptionFinding,
  right: AdoptionFinding,
): number {
  return left.code.localeCompare(right.code) ||
    (left.path ?? "").localeCompare(right.path ?? "");
}
