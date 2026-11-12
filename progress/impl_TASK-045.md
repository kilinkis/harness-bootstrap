# Implementation: TASK-045

## Scope

Add a trivial lane that needs no work item, progress files, or local reviewer, and stop requiring evidence that only duplicates the queue and the request: `progress/history.md` entries and a `progress/current.md` plan. Review binding stays strict for every change that needs a work item.

Review tier: risky-review (trigger: scripts/**, package.json; review-binding and evidence controls change).

## Files changed

- `scripts/trivial-change.ts`: classifier (at most 3 files and 30 changed lines, control paths plus `riskyReview.paths` refused, binary refused), staged-change reader, eligibility command. An unconfigured risk policy makes the lane unavailable.
- `scripts/review-binding.ts`: when the latest done feature's digest differs, the existing cumulative maintenance check runs first. If it refuses, each default-branch step after the canonical review (first-parent, ancestry path) plus the staged index must need no work item: low-risk docs, dependency maintenance, or trivial. The committed-baseline validation still runs first and still fails closed.
- `scripts/dependency-maintenance.ts`: optional `head` revision so a past step compares commits instead of the index.
- `scripts/check-harness-state.ts`, `scripts/harness-evidence.ts`: removed the current-plan and history-entry validators.
- `scripts/small-change.ts`: reuses the shared staged-change reader and non-regular entry check.
- `package.json`: `check:trivial-change`.
- `tests/harness/trivial-change.test.ts`: limits, control and risky paths, binary, step-wise merges, dependency maintenance after trivial merges, stale direct steps, eligibility command, unconfigured policy.
- `tests/harness/harness-state.test.ts`, `legacy-evidence.test.ts`, `minimal-adoption.test.ts`: removed requirements and the new core script.
- `docs/trivial-changes.md` (single home of the lane rules), one-line links in `AGENTS.md`, `README.md`, `docs/run-a-ticket.md`; evidence wording in `CHECKPOINTS.md`, `docs/verification.md`, `docs/parallel-worktrees.md`, PR template.

## Commands and results

- `node --import tsx --test tests/harness/trivial-change.test.ts`: 6 passed.
- `tsx --test tests/harness/*.test.ts tests/metrics/*.test.ts`: 136 passed, 0 failed.
- `pnpm run check`, `pnpm run lint`: passed. `pnpm run analyze:changes`: exit 0; one remaining 8-line clone (the local `git` helper), fewer clone groups than before.
- `pnpm run feedback`: passed on the staged snapshot.

## Round 1 changes

Review round 1 (`progress/review_TASK-045_round1.md`) requested two changes; both are fixed, and optional findings 3 to 5 are also addressed.

- Symlinks, submodules, and mode-only changes now fail every step and the eligibility command (`readStep` reads `git diff --raw`).
- Every dotfile and dot directory, root JSON and YAML files, and nested `pnpm-workspace.yaml` are control paths.
- A risky pattern without a wildcard covers everything under it.
- Local commits after the comparison base and the staged index form one step, matching CI.
- New tests: refused config files, prefix patterns, symlink, submodule, chmod, multi-commit local branch, no risk policy.
- Focused run: `npx tsx --test tests/harness/trivial-change.test.ts tests/harness/review-binding*.test.ts tests/harness/small-change.test.ts tests/harness/legacy-evidence.test.ts tests/harness/canonical-review.test.ts`: 34 passed.

## CI fix after approval

The first CI run failed `local commits after the comparison base count as one step`: CI sets `HARNESS_BASE_REF` to the pull request base, which does not exist in the fixture repository, so the check fell back to judging each commit alone. The fallback now fails closed: without a comparison base on the first-parent path, everything after the approval is one step. This also resolves the round 2 optional finding. The test file clears `HARNESS_BASE_REF` for its fixtures, and a new test covers an unresolvable base. Focused run with `HARNESS_BASE_REF=deadbeef`: 35 passed. Approved snapshot before this fix: commit 73efbfc.

## Remaining risks

A trivial step is judged by paths and size only. A one-line change to sensitive code outside `riskyReview.paths` passes the gate, so projects must list sensitive areas there, and request review remains the semantic check. A direct push of a trivial-sized commit to the default branch is indistinguishable from a merged trivial request; branch protection must prevent direct pushes. Existing `progress/history.md` stays as an archive.

Final approved gate after the refreshed approval: `./scripts/verify.sh` with `HARNESS_BASE_REF` set to the PR base passed, 7 product and 124 harness tests.

Implementation digest: sha256:da62c423761ce08bfe2f360aa0c2e272ea6915ce9caed65972f30d84cc241463
