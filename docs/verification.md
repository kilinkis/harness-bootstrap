# Verification

Use three feedback levels while you work.

## Focused check

Run the smallest test or command that covers the current change. For example:

```bash
pnpm exec tsx --test tests/tasks.test.ts
```

A focused check gives the earliest result. It does not replace a repository gate.

## Fast feedback

Run the inner feedback loop before review:

```bash
pnpm run feedback
```

This command validates harness state, the harness release marker, and the approved target inventory. It then checks types, lint rules, changed-file Fallow findings, and product behavior. It omits harness contract tests to reduce feedback time.

The fast command is not a completion or merge gate. It permits ordinary `in_progress` work. A reviewer starts with independent focused checks before creating approval evidence; feedback does not need to pass as reviewer entry when that approval is still missing.

## Proportional local verification

Use the automatic local selector for an early check:

```bash
pnpm run verify:local
```

The command compares the working tree with the resolved comparison baseline. This includes staged, unstaged, and untracked files. It defaults to `origin/main`; `HARNESS_BASE_REF` overrides that target, and an explicit `--base` takes precedence:

```bash
pnpm run verify:local -- --base origin/develop
```

The selector reports the base, selected gate, and reason. It selects the reduced documentation gate only when every changed path is the allowlisted product guide `docs/task-cli.md`. An empty change set does not qualify. Root documents, process documents, source files, tests, configuration, scripts, and unknown paths route to `pnpm run feedback`.

The reduced gate runs harness-state validation, release-marker validation, review-binding validation, target-inventory validation, and the documentation-facing harness contracts. Review binding uses the committed review baseline described in `review-binding.md`, independently of the selector’s comparison base. An approved documentation-only change can use the low-risk lane in `run-a-ticket.md`. That lane does not activate a queue item or create local progress reports and role handoffs. It still requires change-request review and the full CI gate. CI continues to run only the full shell gate.

This repository defines a trivial change as an edit limited to the approved documentation paths. The edit must not change executable code, tests, configuration, scripts, generated files, queue state, progress evidence, or other process controls. Do not override the automatic classification. If repository policy permits an emergency exception, record the excluded control, reason, approver, and expiry in the work item or change request. Required remote checks and accountable approval still apply.

## Project verification extension

The commands in this repository verify the sample task CLI. They do not prove that an adopted project can build or deploy.

Run the read-only adoption audit before you define the project gate:

```bash
pnpm run audit:adoption
```

The audit discovers pnpm workspace targets and TypeScript configuration. It reports frontend indicators and relevant package scripts. Its proposed inventory is a review aid. It does not decide whether a target is deployable. It does not change the target repository.

Use `pnpm --silent run audit:adoption --json` to emit JSON without pnpm command headers.

Approve the inventory with the [target inventory guide](target-inventory.md). The audit reports malformed, missing, stale, and incomplete entries. It validates command declarations but does not execute them.

Do not put the audit in the standard gate before you approve and configure the inventory. The audit reports incomplete adoption decisions. It does not replace the commands that enforce those decisions.

During adoption, define a project-owned command such as `verify:project`. It must cover every target recorded in `ADOPTION_CHECKLIST.md`. Include all required workspace type checks, tests, and production builds. Compose it into the full `verify` command, not only into an optional workflow. The supported shape is `pnpm run check:delivery && pnpm run feedback && pnpm run verify:project && pnpm run test:harness`. Keep each required stage in order and preserve `&&` failure propagation. The project stage is optional for the sample CLI and required when an adopter defines project verification.

Do not assume that a root `tsc --noEmit` command covers a monorepo. Select TypeScript project references, workspace scripts, Turborepo, Nx, or another existing project mechanism based on the repository's build graph.

Run a deliberate negative test after you configure the command. Introduce a temporary build failure and confirm that `./scripts/verify.sh` exits with a non-zero status. Restore the failure and run the full gate again. Record both results.

## Full gate

After independent approval, the leader runs the full harness gate once before evidence finalization and merge:

```bash
./scripts/verify.sh
```

The shell gate defaults to the `local` delivery phase. It runs `pnpm run verify`, which checks the delivery phase, then composes `pnpm run feedback` with `pnpm run test:harness`. Direct `pnpm run verify` also defaults to the guarded local phase. Default gates do not record workflow metrics or run metric contracts.

The local phase rejects `in_progress` work. An `in_review` feature must pass the existing state and binding checks with its own approved final report, required evidence, and matching digest. The leader runs this phase before marking the feature done.

CI invokes the explicit finalized-state phase:

```bash
./scripts/verify.sh ci
```

The CI phase rejects both `in_progress` and `in_review` features. Completed work must still pass the existing state, review, digest, and history checks. Approved maintenance changes remain valid through the documented binding exception. An empty active queue does not skip the existing validators.

The shell forwards its selected phase through `HARNESS_DELIVERY_PHASE`. The `check:delivery` command makes only the phase decision; subsequent feedback validates schema, evidence, and approval without repeating those checks in the phase guard. Unknown phases fail. To check the finalized phase decision alone after evidence finalization, run `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery`, followed by `pnpm run check:harness-state`.

The feedback command first runs `pnpm run check:harness-state`. This command validates the feature queue and its durable evidence:

- Feature IDs, statuses, titles, and acceptance criteria are valid. An active feature has at most five acceptance criteria. Completed legacy features keep their recorded criteria.
- A skipped feature has a non-empty reason.
- Only one feature is active in the shared workstream.
- Active state agrees with `progress/current.md`.
- Review state has an implementation report.
- A completed tracked feature has implementation and review reports and a history entry.
- Required reports identify their feature and contain evidence sections.

A feature is tracked when it has a non-empty `issue` field. Completed bootstrap features without an issue predate the delivery workflow. The validator does not require fabricated reports for those legacy features.

The validator checks the presence and structure of evidence. It cannot prove that a recorded command ran or that a written claim is true. The command exit status and required remote CI check remain the trusted execution evidence.

After harness-state validation, the commands run complementary checks:

1. `pnpm run check:release` validates `HARNESS_VERSION` and its matching changelog entry.
2. `pnpm run check:review-binding` binds review to the staged implementation snapshot.
3. `pnpm run check:targets` validates the approved target inventory against package discovery.
4. `pnpm run check` performs TypeScript type checking.
5. `pnpm run lint` applies type-aware ESLint rules and the repository's file-length limit.
6. `pnpm run analyze:changes` resolves the shared comparison baseline and passes its commit explicitly to Fallow's new-only audit. It checks changed files for dead code, dependency problems, cycles, complexity, large functions, and duplication.
7. `pnpm run test:product` checks the sample task CLI's behavior in the fast loop.
8. `pnpm run test:harness` runs only in the full gate. It generates isolated fixtures proving harness-state validation, release-marker validation, review binding, target-inventory validation, command composition, ESLint, and Fallow reject representative policy violations and accept valid state.

Before review, stage every intended implementation file. Run `pnpm run review:digest`. Follow the [review-binding protocol](review-binding.md). The standard gate skips binding while a feature is `in_progress`. When no feature is active, the latest completed tracked approval remains binding. The documented maintenance exception compares cumulative staged documentation and dependency changes with the verified committed review baseline. The gate enforces the active binding while a feature is `in_review`, including the leader's post-approval full gate.

Dependency maintenance is the only additional no-active-feature exception. It permits pnpm lockfile changes, dependency or package-manager declarations in `package.json`, and the pnpm setup version in the verification workflow. It does not permit scripts, source, arbitrary manifest fields, other workflow changes or unknown implementation files. Queue and progress evidence retain their digest exclusions. The full gate and required remote review remain mandatory.

Use `pnpm run analyze` when you need a full-codebase Fallow report rather than the changed-file merge gate. Its thresholds and CLI entry point are versioned in `.fallowrc.json`; duplication above 5% fails the analysis. The CRAP threshold is calibrated above Fallow's static estimates because this small Node test setup does not emit Istanbul coverage; cyclomatic, cognitive, and function-size limits remain independently enforced.

For a feature, add the smallest focused command that demonstrates its behavior. The implementer runs focused checks and the fast loop before review. The reviewer runs independent focused checks. After approval, the leader runs the one final local full gate on the approved snapshot. CI checks out full Git history and supplies the pull-request base SHA or pre-push SHA for comparison.

After the full gate passes, the leader makes the evidence-only finalization changes in `feature_list.json` and `progress/`. The leader then runs `pnpm run check:harness-state` as a focused state check. These files are outside the reviewed implementation digest.

Harness-state and Fallow contract fixtures are created under the operating system's temporary directory. The type-aware ESLint fixture is created within the test tree so TypeScript's project service can resolve it. Every fixture is removed in a `finally` block, so intentionally invalid state never remains in the repository or enters the normal pre-test analysis.

Record exact commands and exit results in the implementation report. A passing command run before a change is not evidence for the final state.

Workflow metrics are optional. Use their explicit commands when adoption data is needed. See [workflow metrics](workflow-metrics.md) for gate recording, contract tests, storage, privacy, CI export, agent usage, summaries, and evidence limits.

Use the [bounded repair loop](repair-loop.md) when a deterministic command fails. Record each repair attempt in the implementation report. Stop when the repair cycle uses its three-attempt budget.

## Comparison baseline

Fallow change analysis, the local selector, and impact analysis use one resolver. Selection precedence is an explicit selector `--base`, then `HARNESS_BASE_REF`, then `origin/main`. The resolver finds the selected target's common ancestor with `HEAD` and returns its commit SHA. A feature branch's own upstream never selects the baseline. Pushed feature commits therefore remain in scope when the upstream already points at `HEAD`.

The local selector forwards the resolved SHA to its selected command. Fallow receives that SHA through an explicit `audit --base` argument. Human-readable output records the requested ref and resolved commit. To verify against a different default branch, use:

```bash
HARNESS_BASE_REF=origin/develop pnpm run feedback
pnpm run verify:local -- --base origin/develop
pnpm run impact --base origin/develop
```

The checked-in CI workflow supplies the pull-request target SHA for PR runs and the event's pre-push SHA for default-branch pushes. Normal pre-push ancestors resolve to that exact prior commit. Fetch full history before verification. Missing refs, missing common history, and invalid nonzero refs fail with `COMPARISON_BASE_INVALID`; they do not fall back to `HEAD` or an empty diff.

GitHub represents the first push with an all-zero before SHA. That value selects full analysis. The selectors enumerate all tracked and unignored untracked paths. The Fallow adapter runs its full command with `--fail-on-issues`, so existing findings remain blocking on the first push. This mode does not require a fabricated predecessor commit.

Review binding uses a different baseline: the immutable implementation snapshot approved in the final report. Comparison-base configuration does not change that approval anchor. Use the raw `pnpm exec fallow` CLI for manual analysis options; the standard change-analysis command owns its scope and takes its target from `HARNESS_BASE_REF`.

## Reusable command contracts

The verification-loop contracts accept both the sample full gate and the documented `verify:project` extension. They require the delivery guard, feedback, and harness tests in order. The optional project stage runs between feedback and harness tests. These checks support that simple sequential command shape; they do not parse arbitrary shell programs.

The project-gate contracts execute an isolated copy of the reusable contract with the extension enabled. Temporary stub commands prove execution order and that failure in any required stage, including the project check, stops later work. No project build is executed by those fixtures.

Assertions named "sample bootstrap" describe this repository's optional documentation and metrics command defaults. Adapt those sample expectations when changing optional capabilities during adoption. Keep the required-stage and failure-propagation contracts.
