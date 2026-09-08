# Workflow Metrics

The harness can record small workflow events as JSON Lines. Recording is opt-in. Each line is one version 1 event. The runtime contract and `workflow-metrics.schema.json` define the accepted fields.

## Storage

The default file is `.task-harness/metrics.jsonl`. Git ignores the `.task-harness/` directory. This keeps local observations out of commits.

Set `HARNESS_METRICS_FILE` to export events to a different path. A relative path resolves from the repository root. CI can set the path to its artifact directory and upload that file after the gate:

```bash
HARNESS_METRICS_FILE=artifacts/workflow-metrics.jsonl \
  pnpm run metrics:gate -- full -- ./scripts/verify.sh
```

Configure the CI artifact upload to run after both successful and failed gates. This preserves failed-gate events.

The recorder creates the parent directory and appends one line. It does not replace existing events. It bounds each encoded event to 4 KiB and uses a lock directory to coordinate cooperating processes. Lock acquisition stops after five seconds. A stale lock therefore causes a metrics warning instead of an unbounded wait or a changed gate result.

Define a retention period for local and CI files. Delete or rotate the whole JSONL file after that period. Do not edit individual lines because that destroys append-only evidence.

## Optional gate events

Default fast, documentation, and full gates do not record metrics. This keeps telemetry and its contracts out of required feedback and CI. Wrap a gate explicitly when you want adoption data:

```bash
pnpm run metrics:gate -- fast -- pnpm run feedback
pnpm run metrics:gate -- docs -- pnpm run verify:docs
pnpm run metrics:gate -- full -- ./scripts/verify.sh
```

Each event contains the schema version, gate name, outcome, start time, wall time, and exit code. Start time uses the canonical UTC form `YYYY-MM-DDTHH:mm:ss.sssZ`. A passed event has exit code 0. A failed event has an exit code from 1 through 255.

The wrapper does not record the wrapped command or its arguments. It runs the gate first and preserves its exit status. A failed gate cannot become successful because metrics collection failed. A metrics write failure prints a warning. It does not change a successful or failed gate status. This makes verification authoritative and telemetry best-effort.

## Agent-run events

Record usage that an agent provider or runner makes available:

```bash
pnpm run metrics:agent -- \
  --provider openai \
  --model example-model \
  --input-tokens 12000 \
  --output-tokens 3000 \
  --estimated-cost-usd 0.08 \
  --wall-time-ms 42000
```

All usage fields are optional. The event omits token and cost fields when the runner does not supply them. Token counts must be non-negative safe integers. Cost and wall time must be finite, non-negative, and no larger than `Number.MAX_SAFE_INTEGER`. Provider and model identifiers have a 256-character limit. Summary aggregation rejects a total above the same numeric bound instead of emitting a non-finite value.

The harness does not calculate cost from a pricing table. `estimatedCostUsd` is a caller-supplied estimate. Record the provider and model with it when available. Provider invoices remain the authoritative cost source.

## Summary

Print a human-readable summary:

```bash
pnpm run metrics:summary
```

Print JSON for an artifact processor or dashboard:

```bash
pnpm run metrics:summary -- --json
```

Use `--file path` with either manual command to override the configured path. The summary reports gate counts, failures, gate wall time, agent-run count, input and output token totals, estimated cost, and agent wall time.

Run the optional metric contracts explicitly:

```bash
pnpm run test:harness:metrics
```

## Privacy and evidence limits

Events contain fixed metadata fields only. Do not add prompts, source content, command arguments, secrets, personal data, repository paths, or free-form notes. Provider and model values must be public identifiers, not credentials.

Local JSONL is operational evidence. It is not authenticated and a user can edit or manufacture it. It does not replace CI logs, provider billing records, required reviews, or branch protection. Treat summaries as adoption data, not proof of reviewer identity or gate execution.
