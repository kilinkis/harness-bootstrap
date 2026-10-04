# Review: TASK-040

## Verdict

Approved.

Implementation digest: sha256:bc78de486934a698fb774c698455e1911ac2ca5c0cf733ce9fc9728f4b3aae95

## Scope reviewed

Reviewed all five acceptance criteria, `progress/impl_TASK-040.md`, and commit `b92fd3b` against its parent. The commit adds `harness.models.json`, `docs/model-routing.md`, `docs/model-adapters.md`, and `tests/harness/model-routing.test.ts`. It also changes the three role files, `AGENTS.md`, and `docs/adoption-map.md`. The staged index adds only digest-excluded queue and progress edits on top of `HEAD`. The review used the `risky-review` tier because `harness.models.json` matches the `harness.*.json` trigger.

- Criterion 1: the config defines three cost tiers, four task tiers, risky-review paths and conditions, and a default task tier for each role. It names no vendor, tool, or model.
- Criterion 2: `agents/leader.md`, `agents/implementer.md`, and `agents/reviewer.md` state `explore-report`, `implement`, and `review`. These values match `roles` in the config.
- Criterion 3: `docs/model-routing.md` explains each tier, the role defaults, and the escalation rules. The reviewer can raise the tier but cannot lower it.
- Criterion 4: `docs/model-adapters.md` is marked optional. No script or gate reads it, and `docs/adoption-map.md` lists it as optional.
- Criterion 5: the new test validates the config shape, role-file consistency, and the absence of vendor terms in the config and the routing guide. `test:harness` runs it through the `tests/harness/*.test.ts` glob.

All new links resolve: `docs/model-routing.md`, `docs/model-adapters.md`, and `docs/workflow-metrics.md` exist. `pnpm run metrics:agent` accepts `--provider` and `--model`. The prose follows the technical prose rules.

No required findings.

- Optional, low: the test does not compare the "Role defaults" table in `docs/model-routing.md` with `roles` in the config. A later edit to the table alone would not fail the test. The role files and the config are checked.
- Optional, low: the risky-review triggers are advisory. The implementation report already records this risk.

## Commands and results

- `pnpm exec tsx --test tests/harness/model-routing.test.ts tests/harness/adoption-guidance.test.ts`: 4 passed, 0 failed.
- Drift check in a scratch copy outside the repository: baseline 3 passed. Each of these changes made exactly 1 test fail: reviewer role file set to `risky-review`, a vendor model name in the config, a vendor model name in `docs/model-routing.md`, an unknown cost tier, and a removed `coordinator` role.
- `pnpm run check:harness-state`: harness state valid.
- `git diff --cached --check`: passed.
- `pnpm run review:digest`: independently reproduced the digest above. It matches the digest in the implementation report.
- `git diff --stat`: no unstaged tracked changes.

## Remaining risks

The policy is advisory. No script selects a model or detects a risky-review trigger. The vendor check uses a fixed term list, so a vendor name outside the list is not detected. The implementer owns the final full gate and the delivery checks.
