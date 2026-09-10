# Adoption Handoff

Use this protocol when an agent adapts the harness to an existing repository. Start with the [minimal adoption map](adoption-map.md) to select files and establish runtime, installation, and Git prerequisites.

## Completion boundary

An adopted harness means that the repository has the relevant harness workflow, role rules, durable evidence, and verification commands.

An adopted project gate means that the approved target inventory is complete and the full gate runs the required type checks, tests, and production builds for that repository.

Product readiness is a separate decision. It includes the product-specific risks in the [production-readiness checklist](production-readiness.md). A passing harness gate does not prove product readiness.

## Agent handoff protocol

When the adoption task starts:

1. Read the repository's existing instructions, architecture, commands, and deployment configuration.
2. Adapt the harness through the normal work-item and review workflow. Preserve product code, project commands, target inventory, queue state, and local configuration.
3. Run `pnpm run audit:adoption` and approve `harness.targets.json` with the repository owner or responsible agent.
4. Configure the project verification extension and run every applicable production build in the full gate.
5. Perform the deliberate negative build test from the [adoption checklist](../ADOPTION_CHECKLIST.md).
6. Record commands, results, deployment differences, unresolved decisions, and risks in the adoption work item and its implementation report.
7. Run the full verification gate. Declare harness adoption complete only when the checklist's completion condition is satisfied.

The final handoff must state all three outcomes separately:

- Harness adoption: complete or incomplete, with the evidence location.
- Project-gate adoption: complete or incomplete, with target and build evidence.
- Product readiness: not assessed, partially assessed, or complete, with the applicable checklist items.

Do not claim that the product is production-ready because the harness gate passes. Do not leave unresolved checklist items as an unqualified “all done.”

## Continue immediately

After the adoption outcome is recorded, inspect the [production-readiness checklist](production-readiness.md). Identify the first unresolved item that has a clear owner, acceptance criteria, and safe next action. Tell the user what remains and offer to create or start that work item immediately.

Continue in the same turn only when the user has already authorized the work and the acceptance criteria are clear. Otherwise, ask the user to approve the proposed first work item or provide the missing owner, threshold, or product decision. Keep the adoption work complete and separately traceable from the follow-up product work.

## Suggested final response

> Harness adoption is complete. The project gate covers [targets and production-build evidence]. Product readiness is not complete: [remaining risks or decisions]. The first actionable follow-up is [work item] with [owner and acceptance criteria]. Shall I start it now?

If no follow-up remains, state that the production-readiness checklist is complete and link its evidence. If adoption is incomplete, state the exact blocker and do not present the repository as ready.
