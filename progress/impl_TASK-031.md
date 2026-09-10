# Implementation Report: TASK-031

## Scope

Restrict historical evidence exemptions to the three unchanged original bootstrap definitions. All other completed work needs a nonempty local or remote work-item reference and normal implementation, final-review, history, and binding evidence. This implements assessment R8 and issue #64 without fabricating historical reports.

## Files changed

- `scripts/legacy-bootstrap.ts`: pins the complete TASK-001, TASK-002, and TASK-004 queue definitions using SHA-256 over sorted object entries. JSON object key order is ignored; every field and acceptance criterion remains part of identity.
- `scripts/check-harness-state.ts` and `scripts/harness-state-support.ts`: record explicit legacy identity instead of inferring exemption from a missing reference. Missing references on new completed work produce `FEATURE_ISSUE_MISSING`; existing invalid-reference checks remain.
- `scripts/harness-evidence.ts`: requires implementation, approved review, and history evidence for every completed nonlegacy feature, even when its reference is missing.
- `scripts/review-binding.ts`: shares the historical identity predicate, selects completed nonlegacy work for binding, and rejects missing, empty, or invalid references with `REVIEW_BINDING_ISSUE_MISSING` before a standalone check can skip them.
- `tests/harness/legacy-evidence.test.ts`: covers the three unchanged historical definitions, new work without references or reports, reused historical IDs with changed definitions, valid local references with complete evidence, and later reference removal or invalidation.
- `tests/harness/harness-state.test.ts`: replaces fabricated historical fixture definitions with the actual preserved definitions. The acceptance-limit fixture still proves that only active criteria are limited.
- `ADOPTION_CHECKLIST.md`, `docs/review-binding.md`, and `docs/verification.md`: document references, historical identity, and removal of bootstrap-specific exemptions and expectations when adopting a fresh queue.
- `feature_list.json` and `progress/current.md`: record the review handoff. TASK-032 remains pending.

Source and test additions total 124 lines, below the 300-line implementation target. The original TASK-001, TASK-002, and TASK-004 queue definitions, existing history, and historical review reports remain unchanged.

## Commands and results

- Startup `pnpm run feedback`: passed all fast checks and 7 product tests.
- `pnpm exec tsx --test tests/harness/legacy-evidence.test.ts`: established the regression before implementation. Historical compatibility passed; all 3 new-work, reused-ID, and reference-removal contracts failed because missing references granted exemptions.
- `pnpm exec tsx --test tests/harness/legacy-evidence.test.ts tests/harness/harness-state.test.ts tests/harness/review-binding.test.ts tests/harness/canonical-review.test.ts tests/harness/delivery-gate.test.ts`: passed all 36 focused contracts after the fix.
- `pnpm exec tsx --test tests/harness/verification-loop.test.ts tests/harness/adoption-guidance.test.ts`: passed all 8 guidance and composition contracts.
- Final `pnpm run feedback`: passed state, release, review binding, target inventory, TypeScript, ESLint, explicit-base Fallow analysis, and all 7 product tests. Comparison used `origin/main` at `db63e0c09b539bb48f4840c934fcdb71b946a35e`.
- `git diff --cached --check`: passed. Inspected staged validators, identity helper, focused tests, and guidance. The queue diff preserves all historical definitions.
- `pnpm run review:digest`: passed and produced the digest below.

Fallow reported the inherited duplication between the existing local and impact option parsers. Its unchanged new-only gate excluded that inherited finding and passed. No unrelated cleanup was made.

The implementer did not run the full repository gate, commit, push, or merge. Final entry execution was limited to temporary fixtures with expensive downstream stages stubbed.

## Repair attempts

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Focused historical-evidence, state, binding, canonical-review, and delivery contracts; then guidance contracts and `pnpm run feedback` | Omitting a work-item reference exempted new completed work and reused historical IDs from evidence requirements. | Shared a pinned historical-identity predicate, required evidence for all other completed work, and made standalone binding reject missing references. | All 44 focused contracts and fast feedback passed. |

## Review binding

Intended implementation files were staged before handoff. Queue and progress evidence retain their documented digest exclusions. Existing `output/` and `tmp/` artifacts remain untracked and untouched.

Implementation digest: sha256:02ef21aba854a4cd4b96eabcf2b37e34289ae54d37a53053bf03161d6fc01d37

## Remaining risks

The three pinned exceptions preserve the original bootstrap record. They do not establish retrospective verification or reviewer identity. Fresh adopters should remove the exception map and its history-specific fixture expectations instead of repinning replacement work.

A work-item reference can be local or remote. Validation checks that it is a nonempty string; it does not verify the external item's existence. Normal evidence and binding remain required.

Publication remains blocked by the earlier automatic approval review decision recorded in `progress/current.md`. No publication retry was made.

## Leader verification

After independent approval, `./scripts/verify.sh` exited 0 on the approved snapshot. All fast checks, 7 product tests, and 100 harness contracts passed. Queue and progress evidence were finalized without changing implementation content.

After evidence finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery` and `pnpm run check:harness-state` passed.


## CI repair integration

Integrated the independently reviewed fixture correction from TASK-030. The only implementation delta from the original TASK-031 HEAD is the same 3 added lines in `tests/harness/local-verification.test.ts`. The staged and incoming blobs both equal `84c631e75c1e084ab3a0541d58b2df76c70555c7`. No production code or new source changes were made.

- `HARNESS_BASE_REF=1111111111111111111111111111111111111111 pnpm exec tsx --test tests/harness/local-verification.test.ts`: all 6 contracts passed.
- `pnpm run feedback`: all fast checks and 7 product tests passed; the inherited parser duplication remained excluded normally.
- `git diff --cached --check`: passed. No unstaged implementation differences remain.
- `pnpm run review:digest`: produced the revised implementation digest above.

The previous approved digest was `sha256:74c5651292d291ee9c27ad5048cce77f977b34312b6e33813f9a0f741a60e2f6`. The old canonical approval remains unchanged for independent preservation and renewal. The leader must run the final gate with the real CI base and require green remote checks. Publication is now authorized; the earlier blocked note records the original implementation context. No full gate, commit, push, or unrelated artifact changes occurred during this integration handoff.

## Leader CI-repair verification

After renewed independent approval, `HARNESS_BASE_REF=db63e0c09b539bb48f4840c934fcdb71b946a35e ./scripts/verify.sh` exited 0. All fast checks, 7 product tests, and 100 harness contracts passed. This repeats the final gate because the CI-discovered fixture repair changed the approved implementation snapshot. Only evidence was finalized afterward.
