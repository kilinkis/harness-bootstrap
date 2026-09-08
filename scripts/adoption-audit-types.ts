export interface AdoptionFinding {
  code: string;
  message: string;
  path?: string;
}

export interface DetectedScript {
  name: string;
  command: string;
}

export interface AdoptionTarget {
  path: string;
  packageName: string | null;
  typescriptConfigs: string[];
  frontendIndicators: string[];
  scripts: {
    typecheck: DetectedScript | null;
    test: DetectedScript | null;
    build: DetectedScript | null;
    dev: DetectedScript | null;
    start: DetectedScript | null;
  };
  deployment: "review_required";
}

export interface ProposedTarget {
  path: string;
  packageName: string | null;
  deployable: "review_required";
  typecheck: ProposedDecision;
  test: ProposedDecision;
  build: ProposedDecision;
}

export type ProposedDecision =
  | { command: string }
  | { reviewRequired: string };

export type InventoryDecision =
  | { command: string }
  | { notApplicable: string };

export interface InventoryTarget {
  path: string;
  packageName: string | null;
  deployable: boolean;
  typecheck: InventoryDecision;
  test: InventoryDecision;
  build: InventoryDecision;
}

export interface TargetInventory {
  version: 1;
  targets: InventoryTarget[];
}

export interface AdoptionAuditResult {
  targets: AdoptionTarget[];
  findings: AdoptionFinding[];
  proposedInventory: {
    targets: ProposedTarget[];
  };
}

export interface PackageManifest {
  name?: unknown;
  scripts?: unknown;
  dependencies?: unknown;
  devDependencies?: unknown;
  peerDependencies?: unknown;
  optionalDependencies?: unknown;
}
