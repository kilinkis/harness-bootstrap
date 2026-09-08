# Review Report — TASK-019 — Round 1

Implementation digest: sha256:addb810843a9e90e16d3cea03c1c1069b5265e5e40df781ffdf7113964258e21

## Scope reviewed

Reviewed the staged TASK-019 snapshot against all acceptance criteria. Reviewed tests before implementation. Evaluated correctness, readability, architecture, security and privacy, and performance. Did not inspect or change unrelated files in `output/` or `tmp/`.

## Files inspected

- `workflow-metrics.schema.json`
- `scripts/workflow-metrics.ts`
- `scripts/record-gate.ts`
- `scripts/record-agent-run.ts`
- `scripts/summarize-metrics.ts`
- `tests/harness/workflow-metrics.test.ts`
- `tests/harness/metrics-guidance.test.ts`
- `tests/harness/verification-loop.test.ts`
- `package.json`
- `.gitignore`
- `docs/workflow-metrics.md`
- `docs/verification.md`
- `feature_list.json`
- `progress/current.md`
- `progress/impl_TASK-019.md`

## Findings

### Required 1: Make concurrent appends preserve one complete JSON object per line

`appendMetricEvent` in `scripts/workflow-metrics.ts` calls `appendFile` without coordination and accepts unbounded `provider` and `model` strings. Node can split a large append into multiple writes. Concurrent calls can interleave those chunks and corrupt every JSONL record.

An independent temporary-directory stress check appended 12 accepted events concurrently with 1.2 MB provider values. The resulting file contained 12 newline-delimited entries, but zero entries parsed as JSON: `{"lines":12,"parsed":0,"bytes":14401310}`.

This violates the append-only JSON Lines contract. Add cross-call and, where supported, cross-process coordination or otherwise guarantee a single bounded atomic record write. Add a concurrent-append contract that parses every resulting line and verifies that no event is lost or merged.

### Required 2: Prevent valid events from producing non-finite summary totals

`validateMetricEvent` accepts every finite non-negative number and accepts any integer token value, including unsafe integers. `summarizeMetrics` adds those values without checking the totals. Two accepted events containing `Number.MAX_VALUE` produce `Infinity` for token, cost, and wall-time totals. JSON summary output serializes each total as `null`.

The independent diagnostic produced `{"accepted":true,"inputTokens":null,"outputTokens":null,"estimatedCostUsd":null,"wallTimeMs":null}` and confirmed that the in-memory cost total was `Infinity`.

This makes the summary incorrect for values that the event validator accepts. Define safe numeric bounds in both contracts and reject unsafe token integers. Also guard aggregate addition so every summary remains finite. Add boundary and overflow contracts for human and JSON output.

### Required 3: Keep the versioned JSON Schema and runtime validator equivalent

`workflow-metrics.schema.json` permits a gate event with `outcome: "passed"` and a non-zero `exitCode`. The runtime validator rejects the same event. The schema also accepts standard date-time forms that the runtime rejects because the runtime requires the exact output of `Date.toISOString()`.

The guide states that the runtime contract and schema define accepted fields, but they currently define different event sets. A CI exporter can therefore emit a schema-valid file that `metrics:summary` refuses to read. Encode the outcome and exit-code relationship in the schema. Align timestamp semantics or document and test an intentional difference. Add parity contracts with representative valid and invalid events.

No additional findings were identified. Gate records use a fixed key allowlist and do not retain wrapped commands or arguments. Unknown agent fields such as `prompt` are rejected. Public fast, documentation, and full wrappers use non-recursive raw scripts, and the full wrapper avoids recording a nested fast event. Gate and metrics-write tests preserve non-zero command results. The default `.task-harness/` storage remains ignored by Git.

## Review axes

- Correctness: Automatic wrapper composition and ordinary success and failure handling are correct. The findings above affect JSONL integrity, summary totals, and schema interoperability.
- Readability: Names and command output are clear. The storage and summary interfaces are small and explicit.
- Architecture: Metrics remain a best-effort wrapper around authoritative gates. Raw commands avoid recursive instrumentation and duplicate full-gate events.
- Security and privacy: Fixed event fields prevent direct storage of command arguments, source content, and prompts. Documentation prohibits secrets and personal data. Provider and model remain caller-supplied identifiers, so operational controls must enforce that guidance.
- Performance: Normal event processing is linear in file size. Full-file summary reads are acceptable for a retention-bounded local log. Concurrent append safety needs correction without introducing an unbounded lock wait.

## Commands and results

- `pnpm run review:digest`: passed. It produced the implementation digest recorded above.
- `git diff --cached --check`: passed.
- `pnpm exec tsx --test tests/harness/workflow-metrics.test.ts tests/harness/metrics-guidance.test.ts tests/harness/verification-loop.test.ts`: passed 13 tests.
- `pnpm run test:harness:docs`: passed 24 tests.
- `pnpm run check`: passed.
- `pnpm run lint`: passed.
- `pnpm run analyze:changes`: passed with one advisory 11-line clone and 0.8% duplication.
- `pnpm run test:product`: passed 7 tests.
- `pnpm run test:harness`: passed 65 tests.
- Concurrent append diagnostic: failed the expected integrity assertion in a temporary directory. Twelve lines were present and zero parsed as JSON.
- Summary overflow diagnostic: confirmed that two runtime-valid events produce non-finite totals and `null` JSON values.
- `./scripts/verify.sh`: stopped at `REVIEW_BINDING_MISSING` because the final approval report does not exist. The new full-gate wrapper preserved the failure and recorded a failed full event. This binding stop is expected during a changes-requested review round.

## Remaining risks

Local metrics remain unauthenticated and caller supplied. A user can edit or manufacture them. Provider and model values can contain sensitive text if a caller violates the documented restriction. CI logs, provider billing, required review, and branch protection remain authoritative.

## Verdict

Changes requested.
