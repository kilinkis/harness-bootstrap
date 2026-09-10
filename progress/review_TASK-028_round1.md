# Review: TASK-028

## Verdict

Approved. No blocking findings remain for TASK-028.

## Scope reviewed

The change satisfies all four acceptance criteria. Fallow, the local selector, and impact analysis use the shared comparison-base resolver. Explicit selector input takes precedence over the environment and documented default. The resolver returns a common-ancestor commit, so a feature's own upstream cannot hide pushed implementation changes. CI supplies the PR target SHA or pre-push SHA. An all-zero first-push input selects full analysis. Invalid nonzero refs and unavailable common history fail without an empty-diff fallback.

Inspected `scripts/comparison-base.ts`, `scripts/analyze-changes.ts`, `scripts/git-changed-paths.ts`, `scripts/local-verification.ts`, `scripts/analyze-impact.ts`, `package.json`, and `.github/workflows/verify.yml`. Also reviewed the comparison-base and verification-loop contracts, existing selector and impact contracts, `docs/verification.md`, `docs/impact-analysis.md`, the TASK-028 criteria, current plan, implementation report, and staged diff. Applied the reviewer role and review-binding protocol.

The Git helper passes arguments without a shell and rejects option-like refs. Fallow receives an explicit commit and propagates its exit status. First-push full analysis uses the gating option. The CI workflow retains full-history checkout and selects the baseline from the appropriate event field. Documentation clearly distinguishes comparison scope from the existing approval-content anchor. No review-binding implementation changed.

No material correctness, readability, architecture, security, or performance issue was found within the accepted scope. No dependency was added. Later command-extension and snapshot work remains separate.

## Commands and results

- `node --import tsx --test tests/harness/comparison-base.test.ts tests/harness/local-verification.test.ts tests/harness/impact-analysis.test.ts tests/harness/verification-loop.test.ts`: passed all 22 contracts with the local IPC access required by CLI subprocesses. These cover pushed branches, independently advanced targets, detached checkouts, non-main overrides, default-branch pre-push inputs, invalid refs, first-push full analysis, selector propagation, and existing impact behavior. The installed-Fallow full-analysis fixture accepted clean code and rejected unused source.
- `pnpm exec fallow audit --help`: confirmed the installed CLI supports explicit `--base` and that its implicit selection can otherwise use the branch upstream. The adapter uses the documented explicit option.
- `node --import tsx /private/tmp/task028-independent-review.mjs`: passed additional temporary Git checks. Installed Fallow rejected a newly committed unused file after the feature upstream advanced to HEAD, and output recorded the intended target baseline. Empty, whitespace, option-like, blob, missing, and unrelated-history refs failed with `COMPARISON_BASE_INVALID`. A 64-zero first-push value selected full analysis. A committed documentation-only change selected and executed `verify:docs` with the resolved SHA in its environment.
- `HARNESS_BASE_REF=missing-review-probe node --import tsx --test tests/harness/review-binding-lifecycle.test.ts`: passed all 3 contracts. Maintenance approval and invalid-anchor handling remained independent of the comparison-base environment.
- `git diff --name-only`: returned no tracked worktree differences from the index.
- `git diff --cached --check`: passed.
- `pnpm run review:digest`: passed with approved IPC access. The independently computed digest matches the implementation handoff.

Temporary fixture repositories were removed after verification. Installed Fallow ran only against focused temporary fixtures. The reviewer did not edit implementation files, stage files, run the full repository gate, commit, push, or retry publication. Existing `output/` and `tmp/` artifacts were left untouched.

Implementation digest: sha256:28e9d139472b72b0f33266a8219ed664524607215ef8564900e9df9364ac4768

## Remaining risks

Normal comparison requires the intended target and common history to exist locally. A missing target or shallow history must be corrected or replaced with an explicit valid target. First-push full analysis intentionally includes existing findings and can require adoption cleanup.

The leader's final local full gate and evidence finalization remain required. Publication remains blocked pending explicit user authorization, as recorded in `progress/current.md`.
