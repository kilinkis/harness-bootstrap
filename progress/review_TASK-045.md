# Review: TASK-045

Review tier: risky-review (scripts/**, package.json; review-binding and evidence controls change).

Implementation digest: sha256:a3f6859041052583fae88efb2ef8d64f4f9c3ecd670762757bfccc78b45ab82f

## Verdict

Approved.

## Scope reviewed

This report reviews round 2. The round 1 change request is in `progress/review_TASK-045_round1.md`, and the reviewed delta is in "Round 1 changes" of `progress/impl_TASK-045.md`. I re-inspected the full staged diff: `readStep` and the control patterns in `scripts/trivial-change.ts`, the step-wise check in `scripts/review-binding.ts`, `scripts/small-change.ts`, tests, and docs. Committed-baseline validation still fails closed. No remaining code depends on the removed history or current-plan validators.

Both required findings from round 1 are fixed. Symlinks, gitlinks, and mode-only changes now fail every binding step and the eligibility command. `.githooks/**`, `renovate.json`, `.npmrc`, `pnpm-workspace.yaml`, `.gitattributes`, and `.fallowrc.json` now require a work item. Bare risky patterns now cover their subtree, and a missing risk policy refuses the lane in the gate. New tests cover each case.

No required findings remain.

1. Optional, medium. `scripts/review-binding.ts:142-149`: the check falls back to one step per commit when the comparison base is not on HEAD's first-parent path. Two cases reach this fallback: a branch that merged `origin/main` into itself, or a missing `origin/main`. Probe: a branch of 90 lines in `src/`, with `origin/main` merged into the middle, made of commits c1 and c2 and a staged change of 30 lines each. `validateReviewBinding` returned no findings. CI on the pull-request merge ref still sees one step, so the gate works there. Locally, though, this fallback lets a change through. To fail closed, judge all commits after the newest first-parent ancestor of the base as one step. The other option is to treat all commits after the anchor as one step.

## Commands and results

- `npx tsx --test` on 8 test files: 45 passed, 0 failed. The files were the trivial-change, review-binding, review-binding-lifecycle, harness-state, legacy-evidence, small-change, minimal-adoption, and canonical-review tests.
- I re-ran the round 1 probes in the scratchpad, outside the repo. All now return `REVIEW_BINDING_STALE`: the ten split commits, the six config paths, `src/auth/login.ts`, the symlink, the gitlink, the chmod, and the unconfigured policy. `check:trivial-change` refuses the symlink. The two new fallback probes reproduce optional finding 1.
- `pnpm -s run review:digest` produced the digest above, which matches the implementation report.
- `git diff --cached --check` passed.
- I did not run the full gate. The implementer runs it on the approved snapshot.

## Remaining risks

A trivial step is judged by paths and size only. Semantic risk outside `riskyReview.paths` relies on request review. Branch protection must prevent direct pushes to the default branch. Optional finding 1 can make the local gate pass on a branch that CI refuses.
