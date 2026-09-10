# Implementation Report — TASK-021

## Scope

Added a tagged release contract and a safe upgrade path for adopted harnesses. The first baseline is `v0.1.0`.

Candidate implementation digest: sha256:fddd3cdf59f51cba64d69951fff2f51c5737103814bdc465c8b207d0eec8020a

## Files changed

- Added `HARNESS_VERSION` and `HARNESS_CHANGELOG.md`.
- Added a reusable release validator and its command adapter.
- Added temporary-fixture tests for valid, invalid, and incomplete release state.
- Added maintainer release guidance and adopter upgrade guidance.
- Routed the upgrade guide from `README.md` and `AGENTS.md`.
- Added release validation to fast and documentation gates.
- Updated verification contracts and guidance.

## Commands and results

- The first preflight `pnpm run feedback` was blocked by the sandbox's TypeScript runner IPC restriction.
- The permitted preflight retry passed without a repository change.
- `pnpm run check:release` passed.
- `pnpm exec tsx --test tests/harness/harness-release.test.ts tests/harness/verification-loop.test.ts` passed 8 tests.
- `pnpm run check` passed.
- `pnpm run lint` passed.
- `pnpm run analyze:changes` passed with no findings after the CLI validator was separated from the reusable module.
- The final implementation `pnpm run feedback` passed 7 product tests.
- The leader-owned `./scripts/verify.sh` passed 7 product tests and 63 harness tests after approval.

## Remaining risks

- The first tag cannot identify the exact baseline of repositories that adopted the harness before version markers existed.
- Upgrades remain semantic migrations. A source release cannot know each product's local harness changes.
- The annotated tag and GitHub release must be created from the verified default branch after merge.
