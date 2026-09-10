# Implementation Report: TASK-029

## Scope

Accept the documented project verification extension in reusable command contracts. Protect the required delivery, feedback, and harness stages and their failure propagation. This implements assessment R6 and issue #62 without adding a shell parser or changing the sample full-gate command.

## Files changed

- `tests/harness/verification-loop.test.ts`: accepts the three-stage sample command or the four-stage project extension. Required stages keep their order and `&&` composition. Optional documentation and metrics assertions have a separate sample-specific test name.
- `tests/harness/project-gate.test.ts`: runs an isolated copy of the actual contract against an extended manifest, executes temporary stub commands, checks stage order and every stage's failure propagation, and rejects missing required stages or masked project failures.
- `tests/harness/delivery-gate.test.ts`: stubs the optional project command in delivery fixtures so adoption does not execute a real project build inside those temporary repositories.
- `ADOPTION_CHECKLIST.md` and `docs/verification.md`: show the delivery guard in the supported extension, specify CI mode, and distinguish reusable requirements from optional sample expectations.
- `feature_list.json` and `progress/current.md`: record the review handoff. Later items remain pending.

Added test lines total 142, below the 300-line implementation target. No production source or historical review report changed.

## Commands and results

- `pnpm exec tsx --test tests/harness/project-gate.test.ts`: the initial fixture setup inherited Node's test context, which suppressed the nested contract runner. Clearing `NODE_TEST_CONTEXT` exposed the intended regression: both exact full-gate assertions rejected the documented project extension. The corrected baseline had 3 passing contracts and 1 failing contract.
- `pnpm exec tsx --test tests/harness/project-gate.test.ts tests/harness/verification-loop.test.ts tests/harness/delivery-gate.test.ts tests/harness/adoption-guidance.test.ts`: passed all 17 focused contracts after the implementation. The fixtures execute `pnpm run verify`, verify all four stages in order, and prove that a failure at each stage stops subsequent work.
- `pnpm run feedback`: passed state, release, review binding, target inventory, TypeScript, ESLint, explicit-base Fallow analysis, and all 7 product tests. Comparison used `origin/main` at `db63e0c09b539bb48f4840c934fcdb71b946a35e`.
- `git diff --cached --check`: passed. Inspected the staged command contracts, fixture code, adoption guidance, and delivery-fixture change.
- `pnpm run review:digest`: passed and produced the digest below.

Fallow reported the inherited duplication between the existing local and impact option parsers. Its unchanged new-only gate excluded that inherited finding and passed. No unrelated cleanup was made.

The implementer did not run the full repository gate, commit, push, or merge. Full command execution was limited to temporary fixtures with stub stages.

## Repair attempts

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `pnpm exec tsx --test tests/harness/project-gate.test.ts` | A deliberately invalid fixture returned success because the nested Node test runner inherited the parent test context. | Removed `NODE_TEST_CONTEXT` from the child environment so the isolated contracts execute. | The intended regression was exposed: the documented extension failed the two exact full-command assertions. |
| 2 | Focused project, verification-loop, delivery, and adoption contracts; then `pnpm run feedback` | The reusable checks required exactly the sample three-stage command. | Accepted the documented optional project stage with strict order and `&&` composition; separated sample expectations and corrected adoption guidance. | All 17 focused contracts and fast feedback passed. |

## Review binding

The intended implementation files were staged before handoff. Queue and progress evidence retain their documented digest exclusions. Existing `output/` and `tmp/` artifacts remain untracked and untouched.

Implementation digest: sha256:2f411ecb473fba243c9fb1ebf462e881203816b0402b6b29ff13c7c6b8b260f7

## Remaining risks

The reusable contract intentionally supports the documented sequential command shape. Projects should put their own orchestration inside `verify:project`. These stub fixtures establish composition and failure handling; adopters must still verify actual project commands and target coverage.

Publication remains blocked by the earlier automatic approval review decision recorded in `progress/current.md`. No publication retry was made.

## Leader verification

After independent approval, `./scripts/verify.sh` exited 0 on the approved snapshot. All fast checks, 7 product tests, and 94 harness contracts passed. Queue and progress evidence were finalized without changing implementation content.

After evidence finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery` and `pnpm run check:harness-state` passed.


## CI repair integration

Merged the independently approved TASK-028 fixture isolation repair into TASK-029. Compared the staged implementation with the prior TASK-029 HEAD: its only changed implementation file is `tests/harness/local-verification.test.ts`, with the exact 3 added lines that isolate `HARNESS_BASE_REF`. Its staged blob and incoming repaired branch blob both equal `84c631e75c1e084ab3a0541d58b2df76c70555c7`. No production behavior or new source edits were introduced.

- `HARNESS_BASE_REF=1111111111111111111111111111111111111111 pnpm exec tsx --test tests/harness/local-verification.test.ts`: all 6 contracts passed, including default selection and explicit bases.
- `pnpm run feedback`: all fast checks and 7 product tests passed. The inherited parser duplication remained excluded normally.
- `git diff --cached --check`: passed. No unstaged implementation differences remain.
- `pnpm run review:digest`: produced the revised implementation digest above.

The original TASK-029 approved digest was `sha256:9381e930e3f8bb10d546da4da57faa773669b8c9973162b9a0c8e4c71d868133`. Its existing canonical approval remains unchanged for the reviewer to preserve and replace. The leader must run the renewed final gate under the real CI base and require successful remote checks. Publication is now explicitly authorized; the earlier blocked note records the initial implementation context. This handoff includes no full gate, commit, or push. Untracked artifacts remain untouched.

## Leader CI-repair verification

After renewed independent approval, `HARNESS_BASE_REF=db63e0c09b539bb48f4840c934fcdb71b946a35e ./scripts/verify.sh` exited 0. All fast checks, 7 product tests, and 94 harness contracts passed. This repeats the final gate because the CI-discovered fixture repair changed the approved implementation snapshot. Only evidence was finalized afterward.
