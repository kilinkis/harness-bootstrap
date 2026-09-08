# Implementation Report — TASK-017

## Scope

Added advisory change-impact analysis for TypeScript workspaces. The result maps changed files to direct targets and transitive workspace consumers. It recommends approved commands but keeps the full merge gate mandatory.

Candidate implementation digest: sha256:1838a9749a7ae89bb4a14385fd9dee87018ca0b7a17ff589a4b8bb457390379e

## Files changed

- Added the analysis interface and dependency traversal in `scripts/impact-analysis.ts`.
- Added the Git-backed human and JSON command in `scripts/analyze-impact.ts`.
- Reused target discovery and manifest parsing from the adoption audit.
- Added direct, transitive, global, uncertain, tracked, untracked, and rename behavior contracts.
- Added the optional `docs/impact-analysis.md` guide.
- Added one routed link to the guide in `AGENTS.md`.
- Added the `pnpm run impact` command.

## Commands and results

- `pnpm run check` passed.
- `pnpm run lint` passed.
- `pnpm run analyze:changes` passed with no findings.
- `pnpm exec tsx --test tests/harness/impact-analysis.test.ts` passed 8 tests.
- `pnpm run impact --base origin/main` completed and included tracked and untracked paths.
- `./scripts/verify.sh` passed 7 product tests and 45 harness tests while the feature was in progress.
- `./scripts/verify.sh` passed 7 product tests and 47 harness tests after the review changes.

## Review changes

- Review round 1 found that inventory validation findings were missing from uncertainties.
- Review round 1 found that staged renames could omit the old target path.
- The implementation now reuses the validated target inventory audit.
- Git path collection now disables rename folding and covers both move paths.

## Remaining risks

- Package-manifest analysis cannot see generated, runtime-loaded, environment, or deployment-provider relationships.
- Untracked files that are not ignored appear in the analysis even when they are unrelated to the current feature.
- The result is advisory. Selective merge gating is not safe without separate repository-specific evidence.
