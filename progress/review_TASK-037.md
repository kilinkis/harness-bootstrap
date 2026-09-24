# Review: TASK-037

## Verdict

Approved.

Implementation digest: sha256:cc4f88f9c908703e4b942dc99c3567effa26e111c18cfab78aa05a21c8cae532

## Scope reviewed

Reviewed all four acceptance criteria, `progress/impl_TASK-037.md`, the staged changes to `scripts/adoption-inventory.ts` and `tests/harness/adoption-inventory.test.ts`, and the existing decision schema in `harness.targets.schema.json`.

The property-count guard matches the schema's exclusive alternatives. Both-property objects fail regardless of the second value's type or content. Existing value validation preserves non-whitespace strings exactly, retains `TARGET_DECISION_INVALID`, and leaves deployable-build enforcement unchanged. The direct matrices cover all three decision slots without introducing a schema interpreter or dependency. No required or optional findings.

## Commands and results

- `pnpm exec tsx --test tests/harness/adoption-inventory.test.ts tests/harness/adoption-audit.test.ts`: 18 passed, 0 failed, 0 skipped, including invalid shapes, exact valid-string preservation, and deployable-build rejection.
- `pnpm run review:digest`: independently reproduced the digest above.
- `git diff --cached --check`: passed. Unstaged tracked changes were limited to digest-excluded `feature_list.json` and `progress/current.md`; no implementation mismatch.

## Remaining risks

Previously accepted inventories with both decision properties now fail, consistently with the existing schema. Declared commands are not executed by this validation. The implementer owns the final full gate and delivery checks.
