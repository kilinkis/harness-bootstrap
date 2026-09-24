# Review: TASK-038

## Verdict

Approved.

Implementation digest: sha256:40d5d2bb3da0e5305f1a965aaa7ce97318b207d6f490bd92e335dd4f7bb1769c

## Scope reviewed

Reviewed all four acceptance criteria, `progress/impl_TASK-038.md`, and the staged changes to the shared queue decoder, state/evidence/binding consumers, supporting types, queue contracts, and minimal-adoption fixture.

`scripts/feature-queue.ts` preserves the former state validation and becomes the shared source of normalized identity, queue policy, and legacy classification. Binding stops on queue findings before selecting approval and retains its queue/reference diagnostic aliases. Evidence traversal, approval selection, digest computation, and maintenance verification remain separate and unchanged. The adoption fixture copies the new required module. No required or optional findings.

## Commands and results

- `pnpm exec tsx --test tests/harness/feature-queue.test.ts tests/harness/harness-state.test.ts tests/harness/review-binding.test.ts tests/harness/review-binding-lifecycle.test.ts tests/harness/legacy-evidence.test.ts tests/harness/canonical-review.test.ts tests/harness/minimal-adoption.test.ts`: 38 passed, 0 failed, 0 skipped. Covers malformed/duplicate/unsafe/status/multiple-active queue rejection, normalized report identity, diagnostic aliases, exact legacy exemptions, approval parsing, maintenance safeguards, and fresh adoption execution.
- `pnpm run review:digest`: independently reproduced the digest above.
- `git diff --cached --check`: passed. Unstaged tracked changes were limited to digest-excluded `feature_list.json` and `progress/current.md`; no implementation mismatch.

## Remaining risks

Standalone binding now intentionally rejects queue defects that it previously ignored. Normalized report IDs do not relax exact legacy-definition matching. The implementer owns the final full gate and delivery checks.
