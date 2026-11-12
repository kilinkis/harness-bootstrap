# Review: TASK-045

Review tier: risky-review (scripts/**, package.json; review-binding and evidence controls change).

Implementation digest: sha256:10d0282042d7151d89f27826497b8780e0867a3a3a40105d43244ba5c25dab65

## Verdict

Changes requested.

## Scope reviewed

Reviewed the criteria, implementation report, and the full staged diff: `scripts/trivial-change.ts`, the step-wise logic in `scripts/review-binding.ts`, the `head` parameter in `scripts/dependency-maintenance.ts`, removed validators, tests, docs, and the PR template. First-parent ancestry-path walking is correct, including an anchor reached through a merge's second parent (verified with git 2.43). Committed-baseline validation still fails closed. An unconfigured policy refuses the lane in the gate. No remaining code depends on the removed history and current-plan validators.

1. Required, medium. `scripts/review-binding.ts:161`: the gate accepts non-regular entries as trivial. `check:trivial-change` and `docs/trivial-changes.md` refuse them. A probe staged a symlink `src/link.ts -> ../scripts/verify.sh`, a gitlink `src/sub` (mode 160000), and a mode-only executable change. `validateReviewBinding` returned no findings for each. Run the regular-mode check for every step, including committed steps.
2. Required, medium. `scripts/trivial-change.ts:19-34`: the control list misses configuration and dependency paths that the criterion excludes. Probes of `.githooks/pre-commit` (this repo's hook), `renovate.json`, `.npmrc`, `pnpm-workspace.yaml`, `.gitattributes`, and `.fallowrc.json` passed the gate as trivial. Block these paths, or document a narrower criterion and get it accepted.
3. Optional, medium. `scripts/review-binding.ts:139`: a branch commit is judged as one local step. A probe of ten 30-line `src/` commits passed locally. The CI pull-request merge ref still judges the request as one step. The risk is disclosed. Judging commits after the comparison base as one step would make the local result match CI.
4. Optional, low. `scripts/trivial-change.ts:94`: a `riskyReview.paths` entry without a glob, such as `src/auth`, matches only that exact path. `src/auth/login.ts` passed. Either document that entries must be globs or treat a bare entry as a directory prefix.
5. Optional, low. `tests/harness/trivial-change.test.ts`: no test covers the unconfigured-policy refusal in `validateReviewBinding`. My probe confirmed the behavior.

## Commands and results

- `npx tsx --test` on the trivial-change, review-binding, review-binding-lifecycle, harness-state, legacy-evidence, small-change, and minimal-adoption tests: 36 passed, 0 failed.
- Throwaway probes in the scratchpad (not in the repo) reproduced findings 1 through 5.
- `pnpm -s run review:digest`: produced the digest above, which matches the implementation report.
- `git diff --cached --check`: passed.
- I did not run the full gate.

## Remaining risks

Required findings 1 and 2 let a change that needs review pass `check:review-binding` without a work item. CI and request review are then the only controls. Path-and-size classification cannot detect semantic risk outside `riskyReview.paths`. Branch protection must prevent direct pushes to the default branch.
