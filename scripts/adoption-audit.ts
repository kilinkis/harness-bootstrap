import { resolve } from "node:path";

import {
  discoverTargets,
  fileExists,
  readRootScripts,
} from "./adoption-target-discovery.js";
import { addFinding, compareFindings } from "./adoption-findings.js";
import type {
  AdoptionAuditResult,
  AdoptionFinding,
  AdoptionTarget,
  DetectedScript,
  ProposedDecision,
  ProposedTarget,
} from "./adoption-audit-types.js";

export async function auditAdoption(root: string): Promise<AdoptionAuditResult> {
  const findings: AdoptionFinding[] = [];
  const targets = await discoverTargets(root, findings);
  await addRepositoryFindings(root, targets, findings);
  for (const target of targets) addTargetFindings(target, findings);
  findings.sort(compareFindings);
  return {
    targets,
    findings,
    proposedInventory: { targets: targets.map(proposeTarget) },
  };
}

async function addRepositoryFindings(
  root: string,
  targets: AdoptionTarget[],
  findings: AdoptionFinding[],
): Promise<void> {
  if (!(await fileExists(resolve(root, "harness.targets.json")))) {
    addFinding(
      findings,
      "TARGET_INVENTORY_MISSING",
      "Review the proposal and create harness.targets.json",
      "harness.targets.json",
    );
  }
  const rootScripts = await readRootScripts(root);
  if (!("verify:project" in rootScripts)) {
    addFinding(
      findings,
      "PROJECT_GATE_MISSING",
      "Define a project-owned verify:project command",
      "package.json",
    );
  }
  if (!rootScripts.verify?.includes("verify:project")) {
    addFinding(
      findings,
      "PROJECT_GATE_NOT_COMPOSED",
      "Compose verify:project into the full verify command",
      "package.json",
    );
  }
  if (typescriptTargetCount(targets) > 1) {
    addFinding(
      findings,
      "ROOT_TYPECHECK_COVERAGE_UNCONFIRMED",
      "Confirm that the project gate checks every TypeScript target",
      "package.json",
    );
  }
}

function addTargetFindings(
  target: AdoptionTarget,
  findings: AdoptionFinding[],
): void {
  addFinding(
    findings,
    "DEPLOYMENT_DECISION_REQUIRED",
    `${target.path}: decide if this target is deployable`,
    target.path,
  );
  if (target.typescriptConfigs.length > 0 && !target.scripts.typecheck) {
    addFinding(
      findings,
      "TYPECHECK_DECISION_REQUIRED",
      `${target.path}: select a TypeScript check or record why it is not applicable`,
      target.path,
    );
  }
  if (!target.scripts.test) {
    addFinding(
      findings,
      "TEST_DECISION_REQUIRED",
      `${target.path}: select tests or record why they are not applicable`,
      target.path,
    );
  }
  if (target.frontendIndicators.length > 0 && !target.scripts.build) {
    addFinding(
      findings,
      "BUILD_DECISION_REQUIRED",
      `${target.path}: frontend indicators need a production-build decision`,
      target.path,
    );
  }
}

function proposeTarget(target: AdoptionTarget): ProposedTarget {
  return {
    path: target.path,
    packageName: target.packageName,
    deployable: "review_required",
    typecheck: proposeDecision(target, target.scripts.typecheck, "Select a type check"),
    test: proposeDecision(target, target.scripts.test, "Select tests or record why none apply"),
    build: proposeDecision(target, target.scripts.build, "Decide if a production build applies"),
  };
}

function proposeDecision(
  target: AdoptionTarget,
  script: DetectedScript | null,
  reviewRequired: string,
): ProposedDecision {
  return script
    ? { command: commandFor(target, script.name) }
    : { reviewRequired };
}

function commandFor(target: AdoptionTarget, scriptName: string): string {
  const selector = target.packageName ?? `./${target.path}`;
  return target.path === "."
    ? `pnpm run ${scriptName}`
    : `pnpm --filter ${selector} run ${scriptName}`;
}

function typescriptTargetCount(targets: AdoptionTarget[]): number {
  return targets.filter(({ typescriptConfigs }) => typescriptConfigs.length > 0).length;
}
