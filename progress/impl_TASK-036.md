# Implementation: TASK-036

## Scope

Share the supported full-gate composition contract between adoption audit and reusable verification tests. Adoption requires an exact project-stage invocation and non-empty project command. The sample bootstrap can omit that stage. No shell interpreter, dependency, or other architecture fix was added.

## Files changed

- scripts/gate-composition.ts: pure validation of ordered stages and project requirements with explicit findings.
- scripts/adoption-audit.ts and tests/harness/verification-loop.test.ts: consume the shared contract instead of separate substring/exact-list rules.
- tests/harness/adoption-audit.test.ts: one direct fixture matrix covering misleading mentions, empty/missing commands, aliases, missing/reordered/duplicate stages, failure suppression, unsupported separators, and valid whitespace.
- Adoption/inventory/workspace fixtures: use the complete supported sequence. Project-gate/minimal-adoption fixtures: copy the new imported module; existing execution/failure tests remain.
- docs/verification.md: supported forms and limits. Queue/progress records track the work.

## Commands and results

- Startup feedback passed, including 7 product tests.
- New audit regression failed on echo verify:project before the fix: /tmp/TASK-036-red.log.
- Focused adoption audit, inventory, workspace discovery, verification, project-gate, and minimal-adoption tests: 30 passed in 9.64 seconds; /tmp/TASK-036-focused.log.
- pnpm run feedback: all fast checks and 7 product tests passed; /tmp/TASK-036-feedback.log.
- git diff --check and review:digest passed. Existing stage-order/failure execution cases passed; no new subprocess matrix was added.

## Repair attempts

The whitespace check found one extra trailing blank line after deleting the old test helper. Removed it; the check passed. Behavioral regression checks passed after the first implementation.

Implementation digest: sha256:7dcdb6c06d040c61412f074c6bc5bb728a336458bccd7762df4fc16d89ade02c

## Remaining risks

Structural validation supports only the documented ordered pnpm run sequence joined with &&. It does not execute project commands or prove their coverage/correctness. Other shell forms produce findings rather than inferred success. Independent review approved the staged digest. The implementer ran ./scripts/verify.sh once after approval: all checks, 7 product tests, and 98 harness tests passed (20.76 seconds for the harness suite). Full log: /tmp/TASK-036-final-full.log. After finalization, HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery, pnpm run check:harness-state, and git diff --cached --check passed. Required remote checks and merge remain delivery steps.
