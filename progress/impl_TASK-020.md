# Implementation Report — TASK-020

## Scope

Reduced the default local workflow cost. Added a narrow classifier-gated product-documentation lane, bounded active work items, streamlined role verification, and made workflow metrics opt-in. Kept required change-request review, review binding for non-low-risk changes, and full CI.

## Files changed or inspected

- `AGENTS.md`, `README.md`, `CHECKPOINTS.md`, and `agents/`: define the streamlined normal roles and finalization order.
- `docs/architecture.md`, `docs/run-a-ticket.md`, `docs/verification.md`, `docs/review-binding.md`, `docs/repair-loop.md`, `docs/impact-analysis.md`, and `docs/parallel-worktrees.md`: define the low-risk lane and align related workflow guidance.
- `docs/workflow-metrics.md` and `package.json`: make gate recording and metric contracts explicit opt-in commands.
- `scripts/check-harness-state.ts`: rejects an active feature with more than five acceptance criteria.
- `scripts/low-risk-documentation.ts` and `scripts/local-verification.ts`: share the explicit `docs/task-cli.md` allowlist and reject root, process, source, configuration, and unknown paths.
- `scripts/review-binding.ts` and `scripts/check-review-binding.ts`: bypass the latest completed binding only for the same low-risk classification and use the selector's Git base.
- `.github/ISSUE_TEMPLATE/feature.yml` and `.github/pull_request_template.md`: expose the size bounds and low-risk evidence option.
- `tests/harness/`: covers active-feature size, classifier exclusions, conditional no-feature review binding, role composition, and full-gate composition.
- `tests/metrics/`: contains the unchanged metric contracts behind `pnpm run test:harness:metrics`.
- `feature_list.json` and `progress/current.md`: record TASK-020 scope and review state.

The rename-aware staged diff adds 299 non-progress lines. The four metric test moves add no lines. No size exception or dependency change is required.

## Commands and results

- Original focused workflow, state, and binding contracts: passed 26 tests.
- Final round-1 repair contracts for classification, binding, and workflow: passed 17 tests.
- Final round-2 focused workflow contract: passed 4 tests.
- `pnpm run test:harness:docs`: passed 23 documentation-facing tests.
- `pnpm run test:harness:metrics`: passed 16 optional metric tests.
- Final focused `pnpm exec tsx --test tests/harness/verification-loop.test.ts`: passed 4 tests.
- Final `pnpm run feedback`: passed state, binding, inventory, type, lint, changed-file analysis, and 7 product tests. Fallow reported the existing 11-line parser clone at 0.8% duplication as an advisory.
- Leader-owned final `./scripts/verify.sh`: passed after approval with 7 product tests and 59 default harness contracts. Metrics contracts did not run and no gate event was recorded.
- `git diff --cached --check`: passed.
- `pnpm run review:digest`: produced `sha256:f799c3036ee8a3bf53fa2f456a220acd1c1224b01794f8383743864c38425c94` for the round-2 repaired snapshot.
- One fast-gate permission request timed out before execution. The permitted unchanged retry ran and exposed the unused export recorded below.
- The first focused invocation could not create the tsx IPC socket in the restricted sandbox. The unchanged command passed after rerun with the required local permission.
- An `rg` consistency check mistakenly used a shell backtick literal. The shell attempted `./scripts/verify.sh`, which stopped immediately when tsx could not create its IPC socket in the sandbox. No full gate completed, and the command was not rerun. The leader retains the required post-approval full gate.

## Repair attempts

### Workflow prose contract cycle

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Focused workflow contracts | 19 of 20 passed. A new assertion required “pull or merge request review,” while the guide used “change-request review.” | The assertion was more specific than the accepted terminology. Matched the durable term. | The next assertion exposed a missing “fast feedback” label. |
| 2 | Focused workflow contracts | 19 of 20 passed. The implementer guide named the command but not the feedback level. | Added the “fast feedback” term to the command instruction. | The next assertion matched “approved” but the guide used “approves.” |
| 3 | Focused workflow contracts | 19 of 20 passed. The approval assertion was grammatically over-specific. | Matched the stable approval stem and retained the command requirement. | Passed 20 of 20 focused contracts. |

### Documentation contract cycle

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `pnpm run test:harness:docs` | 22 of 23 passed. The impact guide contract required the old pre-review full-gate instruction. | Updated the contract to require the leader's post-approval full gate and full CI before merge. | Passed 23 of 23 contracts. |

### Review round 1 repair cycle

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Review diagnostics, focused contracts, docs contracts, optional metrics, and fast feedback | Review showed that README and process Markdown entered the low-risk lane and that all no-active snapshots bypassed binding. Focused, docs, and metric contracts passed after the correction. Fast feedback then reported `LOW_RISK_DOCUMENTATION_PATHS` as an unused export. | Added one shared classifier with only `docs/task-cli.md`; used it for local selection and conditional no-active binding; forwarded the Git base; added excluded-category and stale-binding contracts. | Required behavior passed. Fast feedback failed on the unused export. |
| 2 | `pnpm run analyze:changes`, focused contracts, docs contracts, optional metrics, and `pnpm run feedback` | The allowlist constant did not need a public interface. | Made the constant private and compacted the snapshot to 298 added non-progress lines. | Changed-file analysis passed with the existing advisory clone. Final focused 17, docs 23, metrics 16, and fast feedback with 7 product tests passed. |
| 3 | Focused workflow contract, `pnpm run test:harness:docs`, and `pnpm run feedback` | Round 2 found that `docs/verification.md` still described the removed global no-active binding bypass. | Stated that only no-active `docs/task-cli.md` changes bypass the latest completed binding and added a prose contract for the distinction. | Focused 4, docs 23, and fast feedback with 7 product tests passed. The snapshot adds 299 non-progress lines. |

## Remaining risks

The low-risk lane permits only `docs/task-cli.md` and depends on accountable change-request review and required full CI. It does not create a local digest or progress report. A no-active non-low-risk change stays bound to the latest completed tracked approval. The 300-line bound is guidance. Metrics collect no data unless a caller uses the explicit wrapper.

Candidate implementation digest: `sha256:f799c3036ee8a3bf53fa2f456a220acd1c1224b01794f8383743864c38425c94`
