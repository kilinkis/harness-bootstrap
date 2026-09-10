# Implementation Report: TASK-024

## Scope

Preserve the latest completed review across approved maintenance merges. The gate locates the canonical report's committed snapshot, verifies that snapshot against its digest, and classifies cumulative staged implementation changes from that fixed baseline. Documentation and dependency maintenance can accumulate. Unrelated committed or staged implementation changes still fail.

This implements assessment finding R1 and issue #57. TASK-025 through TASK-032 remain pending. The source change adds no dependency or configuration format.

## Files changed

- `scripts/review-binding.ts`: validates the committed review baseline and compares cumulative staged changes. The Git index and committed tree use the same digest algorithm.
- `scripts/dependency-maintenance.ts`: compares allowed manifest and workflow fields with staged content. Worktree content cannot hide prohibited staged changes.
- `scripts/check-review-binding.ts`: removes the moving comparison base from binding validation.
- `tests/harness/review-binding-lifecycle.test.ts`: covers sequential maintenance merges, default-branch advances, evidence exclusions, rejected committed source changes, invalid baselines, and staged manifest changes hidden by worktree content.
- `tests/harness/review-binding-fixture.ts` and `tests/harness/review-binding.test.ts`: share the existing temporary Git fixture without changing its behavior.
- `tests/harness/verification-loop.test.ts`: updates the documentation contract to the stable maintenance baseline.
- `docs/review-binding.md` and `docs/verification.md`: explain the stable baseline, history prerequisite, staged content scope, and failure behavior.
- `feature_list.json`, `progress/current.md`, and the assessment report: retain the leader's work-item plan and record this handoff.

Added script and test lines total 225, including the extracted fixture helper. The implementation remains below the 300-line target.

## Commands and results

- Startup feedback on refreshed `origin/main` failed with `REVIEW_BINDING_STALE` for TASK-023. The leader also confirmed the same failure in [main CI run 34514802000](https://github.com/kilinkis/harness-bootstrap/actions/runs/34514802000).
- `node --import tsx --test tests/harness/review-binding-lifecycle.test.ts`: reproduced the lifecycle failure before implementation. The documentation fixture passed before merge and failed after the default-branch ref advanced.
- `node --import tsx --test tests/harness/review-binding*.test.ts`: passed all 14 focused contracts after repair. Repeated after simplifying staged-content reads; all 14 passed.
- `pnpm run feedback`: passed state, release, binding, target inventory, TypeScript, ESLint, Fallow changed-file analysis, and all 7 product tests. The first invocation could not open the tsx IPC socket under the sandbox; the environment-approved retry passed without a repository change.
- An isolated local clone at `db63e0c09b53` passed `validateReviewBinding` using the new implementation. It validates the actual merged dependency updates against the existing TASK-023 canonical report at `f52a7f73b619a98c9552f3f9d04b898405543e5d`. The temporary clone was removed afterward.
- `node --import tsx --test tests/harness/verification-loop.test.ts`: passed all 4 contracts after updating the historical docs-only assertion. Fast feedback then passed again with all 7 product tests.
- `git diff --cached --check`: passed after removing one extra blank line left by the fixture extraction.
- Inspected the staged implementation diff and ran `pnpm run review:digest` successfully.

The implementer did not run the full gate. Independent review and the leader's final full gate remain required.

## Repair attempts

The observed startup failure and focused reproduction established the baseline failure. The same repair cycle covered the following attempts.

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `node --import tsx --test tests/harness/review-binding*.test.ts` | The new lifecycle contracts failed after the remote-tracking ref advanced. | Replaced the moving maintenance comparison with a verified committed report baseline and staged comparison. | Eight contracts failed. The new snapshot parser consumed index object IDs as optional object types. |
| 2 | `node --import tsx --test tests/harness/review-binding*.test.ts` | Index parsing returned incorrect object IDs, masking changed content and invalidating baseline comparisons. | Restricted the optional Git object type to `blob` or `commit`. | All 14 focused contracts passed. Fast feedback then passed. |

A separate documentation-contract cycle began after the verification guide changed. The focused verification-loop command failed because its historical regex required the old docs-only exception wording. Attempt 1 updated that assertion to require the latest completed approval and cumulative staged documentation/dependency comparison against a committed baseline. All 4 contracts passed, followed by passing fast feedback.

A later whitespace check reported one extra blank line at the end of the extracted test file. Removed that line; the staged whitespace check passed. Sandbox IPC and index-lock restrictions required environment approval, not code repairs.

## Review binding

The intended implementation files were staged before this handoff. Queue and progress changes retain their documented digest exclusions. Unrelated `output/` and `tmp/` artifacts remain untracked and untouched.

Implementation digest: sha256:8055a78c1f0f469395d5072429d7ab9db610dd35cb4966f3e3c2aac40424e736

## Remaining risks

Maintenance requires the canonical report's committed snapshot. Shallow or rewritten history can remove that evidence; the gate fails closed until valid history is available. A canonical report must remain with its reviewed implementation in the delivered history.

The maintenance check validates content, not reviewer identity or remote approval. Remote review and the full gate remain necessary. Unstaged changes and untracked files remain outside the staged digest; TASK-030 tracks the final local snapshot guard.

## Leader verification

After independent approval, `./scripts/verify.sh` exited 0 on the approved snapshot. All fast checks, 7 product tests, and 71 harness contracts passed. Queue and progress evidence were then finalized without changing implementation content.
