# Review Report — TASK-020 — Round 1

Implementation digest: sha256:5c03539a150ba7a862317879a521562ab7ea3ccee04d86b01ae79d64c8202d68

## Scope reviewed

Reviewed the staged TASK-020 snapshot against all acceptance criteria and the streamlined role workflow. Reviewed tests before implementation. Evaluated correctness, readability, architecture, security, performance, and default workflow cost. Did not inspect or change unrelated files in `output/` or `tmp/`. Did not run the full gate because the accepted workflow assigns the one final local full gate to the leader after approval.

## Files inspected

- `AGENTS.md`
- `CHECKPOINTS.md`
- `README.md`
- `agents/implementer.md`
- `agents/reviewer.md`
- `agents/leader.md`
- `docs/run-a-ticket.md`
- `docs/verification.md`
- `docs/review-binding.md`
- `docs/workflow-metrics.md`
- `docs/architecture.md`
- `docs/impact-analysis.md`
- `docs/parallel-worktrees.md`
- `docs/repair-loop.md`
- `.github/ISSUE_TEMPLATE/feature.yml`
- `.github/pull_request_template.md`
- `package.json`
- `scripts/check-harness-state.ts`
- `scripts/local-verification.ts`
- `scripts/review-binding.ts`
- `tests/harness/harness-state.test.ts`
- `tests/harness/local-verification.test.ts`
- `tests/harness/review-binding.test.ts`
- `tests/harness/verification-loop.test.ts`
- `tests/harness/impact-analysis.test.ts`
- `tests/metrics/`
- `feature_list.json`
- `progress/current.md`
- `progress/impl_TASK-020.md`

## Findings

### Required 1: Exclude root and process documentation from the low-risk lane

`scripts/local-verification.ts` still classifies `README.md` and every Markdown file below `docs/` as documentation-only. This includes root documentation and process controls such as `docs/review-binding.md`, `docs/run-a-ticket.md`, and `docs/verification.md`. The new lane then permits those changes without feature activation, local reports, a digest, or local role handoffs.

The independent classifier check reported `documentation` for `README.md`, `docs/review-binding.md`, and `docs/run-a-ticket.md`. It reported `feedback` only for root controls such as `AGENTS.md` and `CHECKPOINTS.md`.

This conflicts with the guidance that a trivial edit must not change process controls. It also makes path-only approval broader than the accepted low-risk boundary. Define a concrete allowlist for low-risk product documentation. Reject root documents and workflow, review, verification, or other process documentation. Add contracts for each excluded category and update the lane documentation to name the actual approved paths.

### Required 2: Limit no-active review-binding bypass to an automatically classified low-risk change

`selectFeature` in `scripts/review-binding.ts` now returns only an `in_review` feature. When the queue has no active feature, review binding skips every staged snapshot. It does not check whether the change qualifies for the low-risk documentation lane.

An independent temporary Git fixture first validated an `in_review` source snapshot against its report. It then marked the feature `done`, staged a source-code change, and reran review binding. Both calls returned no findings. The later source change therefore escaped the prior digest after evidence finalization.

This weakens normal review binding between local finalization and remote CI. It also applies the low-risk exception without the automatic classification required by the acceptance criteria. Preserve binding for completed normal work when staged changes are source, configuration, scripts, process documentation, root documentation, or unknown paths. Skip the prior binding only when the staged change set passes the narrowed low-risk classifier. Add contracts for both the permitted low-risk case and a rejected post-finalization source change.

No additional findings were identified. Active `in_progress` and `in_review` items are limited to five acceptance criteria, while existing `done` items retain their longer recorded criteria. The staged change adds 196 non-progress lines after rename accounting, below the 300-line target. Default fast, documentation, full, and harness-test scripts neither record metrics nor run metric contracts. The optional metric wrapper and 16 metric contracts remain available through explicit commands. Role guidance assigns focused and fast checks to implementation, independent focused checks to review, one post-approval full gate to the leader, and a focused state check after evidence-only finalization.

## Review axes

- Correctness: Criteria limits, command composition, optional metrics, and role sequencing behave as documented. The two findings affect low-risk classification and approval binding.
- Readability: The workflow prose is direct and the package scripts expose clear default and optional commands.
- Architecture: Separating optional telemetry from default verification reduces coupling. The no-active binding exception must use the same low-risk boundary instead of becoming a global bypass.
- Security: Root and process controls must not enter a lane without local digest binding. Normal implementation changes must remain bound after evidence finalization and through remote verification.
- Performance: The default full harness suite drops 16 metric contracts. Default gates also remove metric-write and lock overhead. The streamlined roles avoid repeated full local runs. These changes materially reduce default cost.

## Commands and results

- `pnpm run review:digest`: passed. It produced the implementation digest recorded above.
- `git diff --cached --check`: passed.
- Rename-aware staged line count: 196 added non-progress lines.
- `pnpm exec tsx --test tests/harness/harness-state.test.ts tests/harness/local-verification.test.ts tests/harness/review-binding.test.ts tests/harness/verification-loop.test.ts`: passed 26 tests.
- `pnpm run test:harness:docs`: passed 23 tests.
- `pnpm run test:harness:metrics`: passed 16 optional metric tests.
- `pnpm run check`: passed.
- `pnpm run lint`: passed.
- Low-risk classifier diagnostic: reproduced approval of `README.md`, `docs/review-binding.md`, and `docs/run-a-ticket.md`.
- Post-finalization binding diagnostic: reproduced no findings after staging a source change with the prior feature marked `done`.
- `pnpm run feedback`: not rerun by the reviewer. The role requires independent focused checks, and an `in_review` feature without a final approval report would stop at review binding. The implementation report records the implementer's passing fast feedback.
- `./scripts/verify.sh`: not run. The leader owns the one final local full gate after approval.

## Remaining risks

The low-risk lane depends on conservative path classification, accountable change-request review, and required full CI. It creates no local reports or digest. The 300-line target remains a human-owned guideline. Optional metric contracts can regress without failing default CI unless a project chooses to require their explicit command.

## Verdict

Changes requested.
