# Implementation: TASK-035

## Scope

Fix the P1 approval ambiguity and empty-evidence defects. Final-review loading, report structure, verdict, evidence, and digest interpretation now live in final-review.ts. State and binding consume that result. No queue/adoption refactor or dependency was added.

## Files changed

- scripts/final-review.ts: shared loading/parsing; one approved verdict and one digest declaration; non-empty evidence; ignore quoted/fenced declarations and HTML comments. Preserve pinned historical selection and inline verdict formats.
- scripts/harness-evidence.ts and scripts/review-binding.ts: remove duplicate review interpretation; retain binding error codes, snapshot digest, and maintenance checks.
- tests/harness/canonical-review.test.ts: conflicting/duplicate verdicts, examples, empty evidence, duplicate digest, valid fenced evidence/CRLF/inline formats, and original pinned reports.
- docs/review-binding.md: document supported structure. Queue and progress files track the work.

## Commands and results

- Startup feedback passed, including 7 product tests.
- New canonical regressions initially failed for conflicting inline approval and empty scope, reproducing the defects: /tmp/TASK-035-red.log.
- Focused canonical/state/binding/lifecycle tests: 31 passed after the diagnostic correction; /tmp/TASK-035-focused.log.
- Final pnpm run feedback: all fast checks passed, including TypeScript, lint, change analysis, and 7 product tests; /tmp/TASK-035-feedback.log.
- After the internal parser simplification, canonical-review tests: 7 passed; /tmp/TASK-035-final-focused.log.
- git diff --check and review:digest passed. Added implementation/test/documentation lines: 196, below the 300-line target.

## Repair attempts

The initial regression implementation exposed a compatibility failure: binding returned extra report findings for a malformed digest. The next correction restored the existing digest-error precedence; the 31-test focused run passed.

Fast feedback then identified a startsWith lint requirement. Replacing the equivalent fence-prefix comparison passed lint and exposed excessive cognitive complexity in readReviewContent. Splitting private structural-field handling reduced complexity; feedback and final canonical regressions passed. No repair cycle exceeded three attempts.

Implementation digest: sha256:605e658d4c6ee13f09eec601945f907525d67a6c91dbc970a5254ebc3cbb4670

## Remaining risks

This parses the supported Markdown report structure, not all Markdown semantics. Non-empty evidence cannot prove its truth or reviewer identity. Historical records/hashes, whole-index binding, and maintenance anchors remain intact. Independent review approved the staged digest. The implementer ran ./scripts/verify.sh once after approval: all checks, 7 product tests, and 97 harness tests passed (22.27 seconds for the harness suite). Full log: /tmp/TASK-035-final-full.log. After finalization, HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery, pnpm run check:harness-state, and git diff --cached --check passed. Required remote checks and merge remain delivery steps.
