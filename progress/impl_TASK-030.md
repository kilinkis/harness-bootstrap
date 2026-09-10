# Implementation Report: TASK-030

## Scope

Reject tracked implementation differences between the reviewed index and the working tree before final verification executes downstream checks. This implements assessment R7 and issue #63. Development feedback remains permissive. The check does not stage files or remove unrelated artifacts.

## Files changed

- `scripts/review-binding.ts`: adds an index-to-working-tree comparison using the existing implementation-path predicate. NUL-delimited Git paths preserve unusual filenames. The command explicitly reports executable-mode and submodule differences and disables external diff and text conversion.
- `scripts/check-delivery.ts`: runs the snapshot check at the existing final-delivery boundary for both local and CI phases. Direct `pnpm run verify` retains the same protection.
- `tests/harness/delivery-gate.test.ts`: exercises actual entry points after approved staged content is edited, deleted, made executable, or added to the index and then edited. It checks nonzero status, the snapshot diagnostic, absence of downstream harness execution, and an unchanged index digest. Positive fixtures retain clean snapshots, evidence-only changes, permissive feedback, and untouched untracked artifacts.
- `docs/review-binding.md` and `docs/verification.md`: describe the final snapshot check, exact evidence exclusions, remediation, and normal-checkout assumption.
- `feature_list.json` and `progress/current.md`: record this review handoff. Later features remain pending.

Source and test additions total 79 lines, below the 300-line implementation target. No historical review report changed.

## Commands and results

- Startup `pnpm run feedback`: passed all fast checks and 7 product tests.
- `pnpm exec tsx --test --test-name-pattern='tracked implementation changes' tests/harness/delivery-gate.test.ts`: failed before implementation. The actual local full entry returned success after an unstaged source edit, despite the approved index digest being unchanged.
- `pnpm exec tsx --test tests/harness/delivery-gate.test.ts tests/harness/review-binding.test.ts tests/harness/verification-loop.test.ts tests/harness/project-gate.test.ts`: passed all 27 focused contracts after the fix. Every final entry rejected each content, deletion, executable-mode, and staged-addition mismatch. The mode fixture also disabled the repository's normal file-mode reporting; the guard still detected the difference.
- Final `pnpm run feedback`: passed state, release, review binding, target inventory, TypeScript, ESLint, explicit-base Fallow analysis, and all 7 product tests. Comparison used `origin/main` at `db63e0c09b539bb48f4840c934fcdb71b946a35e`.
- `git diff --cached --check`: passed. Inspected the staged source, tests, and guidance.
- `pnpm run review:digest`: passed and produced the digest below.

Fallow reported the inherited duplication between the existing local and impact option parsers. Its unchanged new-only gate excluded that inherited finding and passed. No unrelated cleanup was made.

The implementer did not run the full repository gate, commit, push, or merge. Final entry execution was limited to temporary fixtures with expensive downstream stages stubbed.

## Repair attempts

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Focused delivery, binding, verification-loop, and project contracts; then `pnpm run feedback` | The local gate accepted working-tree source that differed from approved staged content. | Added the final-delivery Git comparison with the existing digest exclusions. | All 27 focused contracts and fast feedback passed. |

## Review binding

All intended implementation files were staged before handoff. Queue and progress evidence retain their documented digest exclusions. Existing `output/` and `tmp/` artifacts remain untracked and untouched.

Implementation digest: sha256:2e15f540d795b8867bcd502f1b2574e80e4d169fd3b45fd8db99ba085bd2234b

## Remaining risks

Final verification assumes a normal full checkout without tracked changes hidden by `assume-unchanged` or `skip-worktree` flags. The check uses ordinary Git index-to-working-tree semantics. It does not isolate execution or prevent concurrent edits after the initial check. Those mechanisms are outside this bootstrap feature's accepted scope.

Untracked implementation is outside the digest and snapshot guard. Intended new files must be staged before review. The guard intentionally leaves unrelated untracked user artifacts untouched.

Publication remains blocked by the earlier automatic approval review decision recorded in `progress/current.md`. No publication retry was made.

## Leader verification

After independent approval, `./scripts/verify.sh` exited 0 on the approved snapshot. All fast checks, 7 product tests, and 96 harness contracts passed. Queue and progress evidence were finalized without changing implementation content.

After evidence finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery` and `pnpm run check:harness-state` passed.


## CI repair integration

Integrated the independently reviewed fixture correction from TASK-029. The only implementation delta from the original TASK-030 HEAD is the same 3 added lines in `tests/harness/local-verification.test.ts`. The staged blob and incoming merge blob both equal `84c631e75c1e084ab3a0541d58b2df76c70555c7`. No production code or new source changes were made.

- `HARNESS_BASE_REF=1111111111111111111111111111111111111111 pnpm exec tsx --test tests/harness/local-verification.test.ts`: all 6 contracts passed.
- `pnpm run feedback`: all fast checks and 7 product tests passed; the inherited parser duplication remained excluded normally.
- `git diff --cached --check`: passed. No unstaged implementation differences remain.
- `pnpm run review:digest`: produced the revised implementation digest above.

The previous approved digest was `sha256:83b96f8b1ad293cd96c82570488e4ffde7dbc0bc22d1d863fb5588c32362151d`. The old canonical approval remains unchanged for independent preservation and renewal. The leader must run the final gate with the real CI base and require green remote checks. Publication is now authorized; the earlier blocked note records the original implementation context. No full gate, commit, push, or unrelated artifact changes occurred during this integration handoff.

## Leader CI-repair verification

After renewed independent approval, `HARNESS_BASE_REF=db63e0c09b539bb48f4840c934fcdb71b946a35e ./scripts/verify.sh` exited 0. All fast checks, 7 product tests, and 96 harness contracts passed. This repeats the final gate because the CI-discovered fixture repair changed the approved implementation snapshot. Only evidence was finalized afterward.
