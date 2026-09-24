# Implementation: TASK-037

## Scope

Align runtime inventory decisions with the existing JSON Schema. Require exactly one command or notApplicable property whose value is a non-whitespace string. Preserve valid strings, existing finding codes, and deployable-build validation. No dependency or schema interpreter was added.

## Files changed

- scripts/adoption-inventory.ts: require exactly one decision property before validating its value.
- tests/harness/adoption-inventory.test.ts: two direct fixture matrices cover malformed decisions and exact preservation of valid alternatives in typecheck, test, and build slots.
- feature_list.json and progress/: work item and delivery evidence.

## Commands and results

- Startup pnpm run feedback passed, including 7 product tests; /tmp/TASK-037-start.log.
- Regression reproduced acceptance of both fields when notApplicable was blank; /tmp/TASK-037-red.log.
- pnpm exec tsx --test tests/harness/adoption-inventory.test.ts tests/harness/adoption-audit.test.ts: 18 passed in 0.65 seconds; /tmp/TASK-037-focused.log.
- pnpm run feedback: all fast checks and 7 product tests passed; /tmp/TASK-037-feedback.log.
- git diff --check and pnpm run review:digest passed.
- After evidence finalization, HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery, pnpm run check:harness-state, and git diff --cached --check passed.

## Repair attempts

Attempt 1: the new fixture exposed that validation counted usable values instead of present properties. Added an exact property-count guard. Focused regressions and feedback passed.

Implementation digest: sha256:cc4f88f9c908703e4b942dc99c3567effa26e111c18cfab78aa05a21c8cae532

## Remaining risks

Inventories containing both properties now fail, even if one value is blank or has the wrong type. This matches the existing schema. Validation still does not execute or prove the coverage of declared commands. Independent review approved the staged digest. The implementer ran ./scripts/verify.sh once after approval: all checks, 7 product tests, and 100 harness tests passed (22.90 seconds for the harness suite). Full log: /tmp/TASK-037-final-full.log. Required remote checks and merge remain delivery steps.
