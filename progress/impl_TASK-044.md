# Implementation: TASK-044

## Scope

Split the completed queue into five ordered archive arrays under `progress/feature-history/`. Keep current work in `feature_list.json`. Share archive reading across state, review binding, and delivery. Preserve the accumulated TASK-042 hook and TASK-043 small-code lane.

Review tier: risky-review (queue validation and delivery controls).

## Files changed

- `scripts/feature-queue-files.ts` and `scripts/feature-queue.ts`: ordered optional archives, global ID validation, terminal-status enforcement, and compatible unsplit loading.
- `scripts/check-delivery.ts`: consume the same validated queue as state and binding.
- `tests/harness/feature-archive.test.ts`, `bootstrap-history.test.ts`, and `minimal-adoption.test.ts`: archives, original pins, binding, and fresh adoption.
- `feature_list.json` and `progress/feature-history/001.json` through `005.json`: preserve 42 existing definitions in original order. Only the new work item remains in the current queue.
- `AGENTS.md`, `docs/feature-queue.md`, adoption and review-binding guides: archive maintenance and evidence rules.

The source change is below 300 added implementation lines. The larger data movement preserves existing records without edits. Owner: invoking implementer. Historical reports remain unchanged.

## Commands and results

- Startup baseline reused from the unchanged TASK-043 snapshot: final gate passed 7 product and 112 harness tests.
- Compared combined archive arrays against `/tmp/task-044-original-queue.json`: all 42 definitions and ordering match exactly. Archive sizes: 7,674; 12,291; 7,358; 9,058; and 2,073 bytes.
- `node --import tsx --test tests/harness/feature-archive.test.ts tests/harness/feature-queue.test.ts tests/harness/bootstrap-history.test.ts tests/harness/minimal-adoption.test.ts tests/harness/delivery-gate.test.ts`: passed 18 tests; `/tmp/task-044-focused.log`.
- `pnpm run feedback`: passed, including 7 product tests; `/tmp/task-044-feedback.log`.
- `git diff --check`: passed.
- Independent review: approved with 18 passing tests; `progress/review_TASK-044.md`.
- Final `./scripts/verify.sh`: passed 7 product and 114 harness tests; `/tmp/task-044-full.log`.
- Staged byte-limit check: passed with no exemptions or bypasses.
- Delivery: approved snapshot ready for local commit. Automatic approval review denied external GitHub issue publication; remote publication requires user approval.

## Remaining risks

Archives are queue evidence under the existing progress digest exclusion. Validation still requires evidence, unique IDs, terminal archive statuses, and historical pins. A missing archive directory remains valid for fresh adoption; review must ensure archives are not removed to suppress history. Maintain archive order and preserve completed prefixes when moving future records.

The existing progress history log is also near the byte limit. This item adds only a short history pointer within the limit. No authored files are exempted and the pre-commit hook will run during the actual commit.

Implementation digest: sha256:06d2716a03cb6918434954b2e64e56a395838fb3d4b7551d5cfbe581224ae49f
