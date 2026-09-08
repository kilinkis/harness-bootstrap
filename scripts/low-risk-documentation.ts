const APPROVED_PATHS = new Set(["docs/task-cli.md"]);

export function classifyLowRiskDocumentation(
  changedPaths: string[],
): { approved: boolean; changedPaths: string[]; refusedPaths: string[] } {
  const normalized = [...new Set(changedPaths.map(normalizePath))].filter(Boolean).sort();
  const refused = normalized.filter((path) => !APPROVED_PATHS.has(path));
  return {
    approved: normalized.length > 0 && refused.length === 0,
    changedPaths: normalized,
    refusedPaths: refused,
  };
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}
