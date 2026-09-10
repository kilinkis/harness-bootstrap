# Implementation Report: TASK-026

## Scope

Require one final review report to contain its own approval, feature identity, and verification evidence. Completion and binding use the same report resolver and evidence validator. Numbered rounds cannot supply missing evidence or override a rejected or missing final report.

This implements assessment R3 and issue #59. TASK-027 and later items remain pending. Development and merge-boundary modes are outside this change.

## Files changed

- `scripts/harness-evidence.ts`: reads one final report instead of combining review rounds. Exports the shared review-evidence validator.
- `scripts/final-review.ts`: resolves the canonical final path. Preserves exactly four existing historical final reports only when both original and final file contents match pinned SHA-256 hashes.
- `scripts/review-binding.ts`: uses the same final-report resolver and requires the report's approval and evidence before accepting its digest.
- `tests/harness/canonical-review.test.ts`: covers rejected, incomplete, wrong-feature, missing, and valid final reports; verifies that edits or missing files remove historical exceptions.
- `tests/harness/review-binding-fixture.ts`: supplies a complete approved report for existing binding contracts.
- `docs/review-binding.md` and `agents/reviewer.md`: document required report headings, canonical authority, historical exceptions, and their removal during fresh adoption.
- `feature_list.json` and `progress/current.md`: record the leader-approved historical compatibility decision and review handoff.

Added script and test lines total 179. The implementation remains below the 300-line target. No historical report was edited.

## Historical evidence decision

Inspection found that TASK-005, TASK-009, and TASK-011 recorded their final approvals in `_followup` files. TASK-022 recorded final evidence approval in `_round1`. Their original canonical reports were rejected or incomplete. The leader approved an explicit compatibility boundary and updated the acceptance criteria before the historical mappings were implemented.

Each designated historical report independently has the required approval and evidence. The resolver pins both the original canonical bytes and the designated final bytes. Missing or changed history removes the exception and returns to normal canonical validation. There is no aggregation, wildcard approval search, verdict-format relaxation, or exception for new arbitrary rounds.

## Commands and results

- Inspected the original and final historical reports for TASK-005, TASK-009, TASK-011, and TASK-022. Computed their SHA-256 content hashes with `shasum -a 256`.
- `node --import tsx --test tests/harness/canonical-review.test.ts`: reproduced the defect before implementation. Two contracts failed because an old numbered approval overrode the rejected final report or replaced a missing canonical report. The valid-final contract passed.
- `node --import tsx --test tests/harness/canonical-review.test.ts tests/harness/review-binding*.test.ts`: all 17 contracts passed after canonical-only validation and fixture updates.
- `pnpm exec tsx --test tests/harness/canonical-review.test.ts tests/harness/harness-state.test.ts tests/harness/review-binding*.test.ts`: all 28 focused contracts passed with the fixed historical mappings.
- `pnpm run feedback`: passed state, release, binding, target inventory, TypeScript, ESLint, Fallow changed-file analysis, and all 7 product tests. The repository's existing completed review evidence passed without alteration.
- `git diff --cached --check`: passed. Inspected the staged implementation diff.
- `pnpm run review:digest`: passed and produced the digest below.

The implementer did not run the full gate, commit, push, or merge. Independent review and the leader's final full gate remain required.

## Repair attempts

The initial focused command established the failure before implementation.

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `node --import tsx --test tests/harness/canonical-review.test.ts tests/harness/review-binding*.test.ts` | Numbered approvals overrode rejected or missing final reports. | Replaced report aggregation with one final report and reused the same evidence validator in binding. Updated binding fixtures to include actual approval evidence. | All 17 focused contracts passed. After adding the approved historical migration, all 28 focused contracts and fast feedback passed. |

## Review binding

The intended implementation files were staged before handoff. Queue and progress evidence retain their documented digest exclusions. Existing `output/` and `tmp/` artifacts remain untracked and untouched.

Implementation digest: sha256:bb739eafd73c6d6216fdeed8ebf1e02ed2d92040143ac836bde1c9e831a4fc18

## Remaining risks

Report checks validate structure and the existing explicit approval formats. They cannot prove reviewer identity or that reported commands ran. Required remote controls and actual gate execution remain necessary.

The four historical exceptions depend on exact preserved file bytes. Editing or removing those files requires normal canonical validation. A fresh adoption without this history must remove the four mappings and the history-specific contract, as documented.

Publication remains blocked by the earlier automatic approval review decision recorded in `progress/current.md`. No publication retry was made.

## Leader verification

After independent approval, `./scripts/verify.sh` exited 0 on the approved snapshot. All fast checks, 7 product tests, and 80 harness contracts passed. Queue and progress evidence were finalized without changing implementation content.
