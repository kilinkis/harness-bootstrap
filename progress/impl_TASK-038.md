# Implementation: TASK-038

## Scope

Share feature-queue reading and policy between state validation and review binding. Binding now rejects malformed entries instead of discarding them. Both consumers use trimmed safe IDs, duplicate/status/criteria checks, and the single-active rule. Evidence traversal and approval/digest/maintenance logic retain their responsibilities.

## Files changed

- scripts/feature-queue.ts: existing queue validation moved from state, including the Feature type and active limit.
- scripts/check-harness-state.ts, scripts/harness-evidence.ts, scripts/harness-state-support.ts: consume shared queue types and policy.
- scripts/review-binding.ts: remove the permissive reader; retain existing queue/reference diagnostic aliases through a lookup table.
- tests/harness/feature-queue.test.ts: invalid-queue diagnostic parity and normalized-ID approval regressions through both consumer interfaces.
- tests/harness/minimal-adoption.test.ts: copy the new imported core module.

## Commands and results

- Startup reused the passed TASK-037 main snapshot/environment checks.
- Focused state, queue, binding, lifecycle, legacy evidence, canonical review, and minimal-adoption tests: 38 passed; /tmp/TASK-038-focused.log.
- Queue tests passed after diagnostic translation repairs; /tmp/TASK-038-repair2.log.
- pnpm run feedback passed all fast checks and 7 product tests; /tmp/TASK-038-feedback.log.
- git diff --cached --check and pnpm run review:digest passed.
- After finalization, HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery and pnpm run check:harness-state passed.

## Repair attempts

Fast analysis reported cognitive complexity 20 in binding after inline diagnostic translation. Attempt 1 replaced branches with a lookup table and removed a trailing blank line; focused tests passed, but complexity remained 17. Attempt 2 used callback iteration for the lookup, keeping that translation outside the binding function's branching control flow. Queue tests and feedback passed. No gate threshold was changed.

Implementation digest: sha256:40d5d2bb3da0e5305f1a965aaa7ce97318b207d6f490bd92e335dd4f7bb1769c

## Remaining risks

Standalone binding intentionally rejects more invalid queue states. Existing binding queue/reference codes remain aliases; other queue findings use state codes. Whitespace-padded IDs normalize for report selection, but legacy exemptions still require exact original definitions. Independent review approved the staged digest. The implementer ran ./scripts/verify.sh once after approval: all checks, 7 product tests, and 102 harness tests passed (20.78 seconds for the harness suite). Log: /tmp/TASK-038-final-full.log. Required remote checks and merge remain delivery steps.
