import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface ReleaseFinding {
  code: string;
  message: string;
  path: string;
}

const RELEASE_PATTERN = /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

export async function validateHarnessRelease(
  root: string,
): Promise<ReleaseFinding[]> {
  const findings: ReleaseFinding[] = [];
  const version = await readRequiredFile(
    root,
    "HARNESS_VERSION",
    "HARNESS_VERSION_MISSING",
    findings,
  );
  const changelog = await readRequiredFile(
    root,
    "HARNESS_CHANGELOG.md",
    "HARNESS_CHANGELOG_MISSING",
    findings,
  );
  if (version === undefined || changelog === undefined) return findings;

  const release = version.trim();
  if (!RELEASE_PATTERN.test(release)) {
    findings.push({
      code: "HARNESS_VERSION_INVALID",
      message: "HARNESS_VERSION must contain one stable semantic version with a v prefix",
      path: "HARNESS_VERSION",
    });
    return findings;
  }

  const escapedRelease = release.replaceAll(".", "\\.");
  if (!new RegExp(`^## ${escapedRelease}(?:\\s|$)`, "m").test(changelog)) {
    findings.push({
      code: "HARNESS_CHANGELOG_ENTRY_MISSING",
      message: `${release}: add a matching level-two heading to HARNESS_CHANGELOG.md`,
      path: "HARNESS_CHANGELOG.md",
    });
  }
  return findings;
}

async function readRequiredFile(
  root: string,
  path: string,
  code: string,
  findings: ReleaseFinding[],
): Promise<string | undefined> {
  try {
    return await readFile(resolve(root, path), "utf8");
  } catch {
    findings.push({ code, message: `Cannot read ${path}`, path });
    return undefined;
  }
}
