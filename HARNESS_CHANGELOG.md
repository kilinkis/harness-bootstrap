# Harness Changelog

This file records harness releases. It does not record product releases.

## v0.1.0 — 2026-09-10

This is the first tagged harness baseline.

### Included

- A tool-neutral agent guide with narrow leader, implementer, and reviewer roles.
- A feature queue, durable progress evidence, and digest-bound review approval.
- Fast feedback, a full merge gate, and contract tests for the harness rules.
- An adoption audit and an approved target inventory for type checks, tests, and production builds.
- Optional impact analysis, parallel worktrees, workflow metrics, MCP guidance, and production-readiness gates.
- A classifier-gated lane for the approved low-risk documentation path.

### Adoption actions

- Treat this release as the baseline when the adopted repository has no `HARNESS_VERSION` file.
- Compare the adopted harness with this tag. Adapt missing behavior instead of copying files without review.
- Preserve the product architecture, commands, target inventory, queue, progress history, and local configuration.
- Complete `ADOPTION_CHECKLIST.md`. Confirm that each deployable target builds in the full gate.
- Run the adopted repository's full verification gate before writing `v0.1.0` to `HARNESS_VERSION`.
