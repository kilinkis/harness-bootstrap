# Implementation: TASK-039

## Scope

Separate repository-specific history from reusable validators. One optional JSON file holds the existing pins. Absence grants no exemptions; invalid supplied data fails before partial pins can apply. Fresh adopters omit the data and its dedicated tests without rewriting TypeScript. No dependency, cache, plugin mechanism, or additional gate was added.

## Files changed

- harness.bootstrap-history.json: three original definition hashes and four original paired review hashes, unchanged.
- scripts/bootstrap-history.ts: strict optional-data loading and exact definition hashing; replaces scripts/legacy-bootstrap.ts.
- scripts/feature-queue.ts and scripts/final-review.ts: read repository-owned pins; report BOOTSTRAP_HISTORY_INVALID on invalid supplied history. Existing report hash checks and canonical fallback remain.
- tests/harness/bootstrap-history.test.ts: existing historical contracts moved together; absence, malformed/unreadable data, empty maps, and whitespace-modified legacy IDs covered.
- State, canonical-review, and legacy-evidence tests retain reusable cases. Minimal adoption copies unchanged sources and omits the optional history file; source rewriting is removed.
- docs/adoption-map.md and docs/review-binding.md: omission instructions and fail-closed behavior.

## Commands and results

- Startup reused the passed TASK-038 snapshot/environment. P2 post-merge run 36059327062 succeeded.
- Focused history, queue, state, canonical review, binding/lifecycle, legacy evidence, and minimal-adoption tests: 40 passed; /tmp/TASK-039-focused.log.
- History tests after the repair and extra empty-map/whitespace cases: 5 passed; /tmp/TASK-039-repair.log.
- pnpm run feedback: all fast checks and 7 product tests passed; /tmp/TASK-039-feedback.log.
- Compared JSON pins with the pre-change committed maps: all three definition hashes and four paired review records match exactly.
- git diff --cached --check and pnpm run review:digest passed.
- After finalization, HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery and pnpm run check:harness-state passed.

## Repair attempts

Attempt 1: lint required a cause on the new file-read error. Preserved the caught error with Error cause. Focused history tests and feedback passed. No test or gate requirement was relaxed.

Implementation digest: sha256:75867505377fe0d4f2b53589cd6b134dd1f1388ba1bf9f019eb55a20b8f07cc4

## Remaining risks

The optional file is repository-owned policy, not proof of reviewer identity. Its contents remain in the implementation digest. Do not repin modified work. This repository must keep its pins while retaining historical evidence; fresh adopters omit them. Independent review approved the staged digest. The implementer ran ./scripts/verify.sh once after approval: all checks, 7 product tests, and 104 harness tests passed (21.93 seconds for the harness suite). Log: /tmp/TASK-039-final-full.log. Required remote checks and merge remain delivery steps.
