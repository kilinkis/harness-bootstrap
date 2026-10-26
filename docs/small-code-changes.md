# Small-code-change lane

Use this lane for a small product fix with clear focused coverage. It replaces local fast and full gates with focused tests, type/lint checks, independent review, and final approval checks. Full CI remains required before merge. Keep the normal work item and concise implementation/review reports.

## Eligibility

Stage all intended files, then run `pnpm run check:small-change`. The command examines the cumulative staged diff against the actual PR target, including committed branch changes. It defaults to `origin/main`; set `HARNESS_BASE_REF` only to the actual target. Do not select `HEAD` to hide earlier changes.

The automatic limits are 1–5 implementation files and at most 150 added plus deleted lines. Eligible paths are TypeScript product source under `src/`, root-level `tests/*.test.ts`, and `docs/task-cli.md`. At least one source or test file must change. Queue and progress evidence do not count toward these limits. Binary files, non-regular index entries, harness tests, scripts, hooks, dependencies, configuration, workflow files, and unknown paths require the normal lane. Renames count as deletion plus addition. Tracked unstaged implementation changes fail; unrelated untracked artifacts are left alone. Stage intended new files before classification and review.

The reviewer must also confirm that the change does not affect security, authentication, authorization, secrets, persistent data formats or migrations, concurrency, payments, approval, verification, deployment, or delivery logic. These semantic checks cannot be inferred from file size. Any risky-review trigger, uncertain impact, inadequate focused coverage, or required cross-target build uses the normal lane. Adopters must review the allowlist against their own project boundaries before using it.

## Workflow

1. At startup, reuse a passing check for the same snapshot and environment. For an anticipated eligible change, focused baseline tests plus type/lint checks can replace startup feedback. If later classification or review refuses the lane, run normal feedback before handoff.
2. Implement one item. Stage the intended snapshot and run `pnpm run check:small-change`. Run the relevant focused tests, `pnpm run check`, and `pnpm run lint`. Record exact commands and results. A change without meaningful focused coverage does not qualify.
3. Obtain independent review and focused checks. The reviewer confirms eligibility, coverage, and absence of the risks above, then records `Local verification lane: small-code` in the approved digest-bound report. The classifier alone does not approve this choice.
4. After approval, run `pnpm run verify:small`. It rechecks staged scope, the delivery snapshot, queue state, and review binding. It does not repeat unchanged tests or type/lint checks. This is the local completion gate for this lane. The command verifies approval content and digest; the reviewer remains responsible for semantic eligibility and evidence truthfulness.
5. Finalize queue/history evidence and run the normal focused completion checks. Open the PR with the lane, focused evidence, and reports. Wait for the full required CI gate, including all project builds and harness tests, before merge.

If implementation changes after review, refresh approval and rerun checks affected by the change. Do not treat elapsed time or an unchanged command as a reason to rerun deterministic checks. A focused failure follows the normal repair loop.

`./scripts/verify.sh`, direct `pnpm run verify`, and CI retain the full gate. The early `verify:local` selector retains its existing documentation/feedback behavior; use the explicit small-code commands for this lane. This policy change itself is a harness-control change and does not qualify.
