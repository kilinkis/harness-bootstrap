interface GateCompositionFinding {
  code: string;
  message: string;
  path: string;
}

// Support the documented fail-fast sequence, not arbitrary shell interpretation.
export function validateGateComposition(
  scripts: Record<string, string> | undefined,
  requireProject = false,
): GateCompositionFinding[] {
  const findings: GateCompositionFinding[] = [];
  const commands = scripts?.verify?.split(/\s*&&\s*/).map((command) => command.trim()) ?? [];
  const project = "pnpm run verify:project";
  const hasProject = commands.includes(project);
  if ((requireProject || hasProject) && !scripts?.["verify:project"]?.trim()) {
    findings.push({ code: "PROJECT_GATE_MISSING", path: "package.json",
      message: "Define a non-empty project-owned verify:project command" });
  }
  if (requireProject && !hasProject) {
    findings.push({ code: "PROJECT_GATE_NOT_COMPOSED", path: "package.json",
      message: "Compose pnpm run verify:project into verify after feedback and before test:harness" });
  }
  const expected = ["pnpm run check:delivery", "pnpm run feedback",
    ...(hasProject ? [project] : []), "pnpm run test:harness"];
  if (commands.length !== expected.length || commands.some((command, index) => command !== expected[index])) {
    findings.push({ code: "GATE_COMPOSITION_UNSUPPORTED", path: "package.json",
      message: "Unsupported verify composition; use the documented ordered pnpm run stages joined by &&" });
  }
  return findings;
}
