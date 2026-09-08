# Implementation Report — TASK-018

## Scope

Added proportional local verification for a narrow documentation-only path allowlist. Added an accountable `skipped` queue state. Preserved the full local, CI, completion, and merge gate.

## Files changed or inspected

- `feature_list.json`: recorded TASK-003 as skipped and moved TASK-018 to review.
- `scripts/check-harness-state.ts`: accepts `skipped` and requires a non-empty `skip_reason`.
- `scripts/git-changed-paths.ts`: reads committed, staged, unstaged, and untracked Git paths against a base ref.
- `scripts/local-verification.ts`: selects the documentation gate or normal feedback and reports its base and reason.
- `scripts/analyze-impact.ts`: reuses the shared Git changed-path reader.
- `package.json`: adds `verify:local`, `verify:docs`, and the documentation-contract test command.
- `tests/harness/harness-state.test.ts`: covers valid and invalid skipped entries.
- `tests/harness/local-verification.test.ts`: covers path selection, refusal, explicit and default bases, and staged Git changes.
- `tests/harness/verification-loop.test.ts`: protects reduced, full, and CI command composition, including the complete documentation-facing suite.
- `docs/verification.md`: defines the approved documentation paths, reduced checks, mandatory full gate, and accountable exceptions.
- `README.md`: documents the skipped queue state.
- `agents/implementer.md`, `docs/architecture.md`, `docs/conventions.md`, `docs/repair-loop.md`, `docs/review-binding.md`, `docs/verification.md`, and `progress/current.md`: inspected as required workflow context.

## Commands and results

- `pnpm exec tsx --test tests/harness/harness-state.test.ts tests/harness/local-verification.test.ts tests/harness/verification-loop.test.ts`: passed 18 tests on the completed feature behavior.
- `pnpm exec tsx --test tests/harness/impact-analysis.test.ts tests/harness/local-verification.test.ts`: passed 14 tests after changed-path extraction.
- `pnpm run check`: passed.
- `pnpm run lint`: passed after repair attempt 2.
- `pnpm run verify:local -- --base HEAD --dry-run`: passed after repair attempt 3. It selected normal feedback because this implementation includes non-documentation paths.
- `pnpm run verify:docs`: passed the corrected reduced gate with 22 tests, including the impact-analysis guide contract.
- `pnpm run feedback`: passed on the final implementation. Fallow reported one advisory 11-line command-parser clone and 1.0% duplication. This is below the configured gate threshold.
- `./scripts/verify.sh`: passed on the final implementation. All 7 product tests and 55 harness contract tests passed.
- `git diff --cached --check`: passed.
- `pnpm run review:digest`: produced the corrected snapshot digest `sha256:792769f432aa8b1cb996f461272864bd59a2cfeedfab6bce5c6471849a8f104e`.

## Repair attempts

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `./scripts/verify.sh` | `FEATURE_STATUS_INVALID: TASK-003` | The validator did not support the accepted skipped state. Added skipped-state validation and its contract while implementing the feature. | Focused queue and selector contracts passed. |
| 2 | `pnpm run lint` | `prefer-promise-reject-errors` rejected two raw callback errors. | Wrapped callback failures in explicit `Error` values with causes. | Lint passed. |
| 3 | `pnpm run verify:local -- --base HEAD --dry-run` | The adapter treated pnpm's `--` separator as an invalid option. | Accepted the standalone separator and added the command-path regression contract. | The command, focused contracts, feedback, and full gate passed. |

## Review round 1 repair attempt

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `pnpm run test:harness:docs` | Review confirmed that the 14 selected tests omitted `tests/harness/impact-analysis.test.ts`, which reads the approved path `docs/impact-analysis.md`. | Added the existing impact-analysis contract file to the reduced suite. Updated the composition contract to require it. | The focused composition test passed. The reduced gate passed 22 tests. Fast feedback and the full gate passed. |

## Completion-state repair attempt

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `./scripts/verify.sh` | `REVIEW_BINDING_STALE` compared the staged TASK-018 implementation with TASK-017 approval. | TASK-018 lacked a work-item reference, so the validator treated it as a legacy untracked feature. Added a truthful reference to its local queue entry. This state file is outside the implementation digest. | The completion gate passed: 7 product tests and 55 harness contracts passed. |

## Remaining risks

The reduced path allowlist is intentionally limited to `README.md` and Markdown below `docs/`. Teams that approve more paths must extend the allowlist and contracts deliberately. Git supplies file classification, so an unavailable or invalid base ref stops the command. Fallow reports one advisory 11-line parser clone at 1.0% duplication; it does not exceed the configured threshold.

Candidate implementation digest: `sha256:792769f432aa8b1cb996f461272864bd59a2cfeedfab6bce5c6471849a8f104e`
