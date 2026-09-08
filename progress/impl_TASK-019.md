# Implementation Report — TASK-019

## Scope

Added versioned, append-only workflow metrics for verification gates and explicit agent usage. Added human and JSON summaries. Kept the event model limited to fixed operational metadata.

## Files changed or inspected

- `workflow-metrics.schema.json`: defines the version 1 gate and agent-run event shapes.
- `scripts/workflow-metrics.ts`: validates, bounds, coordinates, appends, and reads JSON Lines events.
- `scripts/workflow-metrics-summary.ts`: aggregates accepted events with checked arithmetic and formats human summaries.
- `scripts/record-gate.ts`: measures a gate, appends its outcome, and preserves its exit status.
- `scripts/record-agent-run.ts`: records available provider, model, token, cost, and wall-time values.
- `scripts/summarize-metrics.ts`: prints human or JSON summaries.
- `package.json`: instruments the public fast, docs-only, and full gates. Adds agent and summary commands.
- `tests/harness/workflow-metrics.test.ts`: covers validation, append behavior, summaries, gate outcomes, collection failure, agent fields, and ignored storage with temporary fixtures.
- `tests/harness/workflow-metrics-integrity.test.ts`: covers concurrent cross-process appends, the reviewer's oversized-event case, numeric boundaries, and summary overflow behavior.
- `tests/harness/workflow-metrics-schema.test.ts`: covers representative schema/runtime parity for timestamps, outcome/exit-code invariants, and published bounds.
- `tests/harness/metrics-guidance.test.ts`: protects the schema and privacy, storage, cost, retention, CI, and evidence guidance.
- `tests/harness/verification-loop.test.ts`: protects raw gate composition and automatic public wrappers.
- `docs/workflow-metrics.md`: documents storage, privacy, CI export, retention, estimated cost, summaries, and evidence limits.
- `docs/verification.md`: links metrics guidance and explains single-event full-gate composition.
- `.gitignore`: inspected. Its existing `.task-harness/` rule covers the default metrics file.
- `scripts/verify.sh`: inspected. It still invokes the public full gate used by CI.
- `feature_list.json` and `progress/current.md`: record TASK-019 scope and review state.
- `AGENTS.md`, `agents/implementer.md`, `docs/architecture.md`, `docs/conventions.md`, `docs/repair-loop.md`, and `docs/review-binding.md`: inspected as required workflow context.

## Commands and results

- Baseline `./scripts/verify.sh`: passed before implementation with 7 product tests and 55 harness tests.
- Final focused `pnpm exec tsx --test tests/harness/metrics-guidance.test.ts tests/harness/workflow-metrics.test.ts tests/harness/workflow-metrics-integrity.test.ts tests/harness/workflow-metrics-schema.test.ts`: passed 16 tests.
- Final `pnpm run check`: passed.
- Final `pnpm run lint`: passed.
- Final `pnpm run verify:docs`: passed 24 documentation-facing contracts and recorded a docs-gate event.
- Final `pnpm run feedback`: passed and recorded a fast-gate event.
- Final `./scripts/verify.sh`: passed with 7 product tests and 71 harness tests. It recorded one full-gate event and did not create a nested fast event.
- `pnpm run metrics:summary`: passed. It reported human-readable gate counts, failures, wall time, and zero agent totals because no provider usage was supplied.
- `pnpm run metrics:summary -- --json`: passed and reported the same aggregate fields as JSON.
- `git diff --cached --check`: passed.
- `pnpm run review:digest`: produced `sha256:335a35198d4a53af04d781b36ef6b0f6b9fb861a27c1914aa226d1b875b6d07c`.

## Repair attempts

### Lint repair cycle

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `pnpm run lint` | Lint reported three unused imports and one optional-chain preference. | Removed the unused imports and used optional chaining in the contract. | Lint passed. |

### Fast-gate repair cycle

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `pnpm run feedback` | Fallow reported `DEFAULT_METRICS_FILE` and `METRICS_FILE_ENV` as unused exports. The wrapper recorded the failed fast gate. | Kept the constants private because no external module consumes them. | `pnpm run analyze:changes`, fast feedback, and the full gate passed. |

### Review round 1 repair cycle

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Review diagnostics and focused metrics contracts | The reviewer's 12-process, 1.2 MB reproduction produced 12 lines and zero parseable events. Two accepted extreme events overflowed summaries. The schema accepted outcome, exit-code, and timestamp combinations rejected at runtime. | Added a bounded 4 KiB event envelope and a cross-process append lock; bounded text and numeric fields; added checked aggregation; encoded the gate invariant and canonical timestamp in the schema; added concurrency, boundary, overflow, and parity contracts. | Fourteen focused behavior contracts passed. `pnpm run check` and `pnpm run lint` then exposed type narrowing, caught-error, file-length, and array-style issues in the repair. |
| 2 | `pnpm run check`, `pnpm run lint`, focused contracts, `pnpm run verify:docs`, `pnpm run feedback`, and `./scripts/verify.sh` | The mechanical and type failures from attempt 1 remained. | Converted validators to assertion functions, preserved the lock error as `cause`, fixed the array style, and moved aggregation into a focused summary module. | Typecheck and lint passed; 16 focused and 24 documentation contracts passed; feedback passed; the full gate passed with 7 product and 71 harness tests. |

## Remaining risks

Metrics are best-effort local evidence. They are not authenticated and can be edited or manufactured. The append lock coordinates harness writers, but a non-cooperating writer can still corrupt the file, and an abandoned lock makes collection time out after five seconds. Agent token and cost totals depend on values supplied by the agent runner. Estimated cost does not replace provider billing. Retention and CI artifact upload remain deployment-specific decisions. A metrics write failure prints a warning and preserves the gate status, so a successful gate can complete without a metric event. Fallow reports an existing 11-line command-parser clone at 0.8% duplication, below the configured threshold.

Candidate implementation digest: `sha256:335a35198d4a53af04d781b36ef6b0f6b9fb861a27c1914aa226d1b875b6d07c`
