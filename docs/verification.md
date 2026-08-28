# Verification

Run the full harness gate from the repository root:

```bash
./scripts/verify.sh
```

The gate first runs `pnpm run check:harness-state`. This command validates the feature queue and its durable evidence:

- Feature IDs, statuses, titles, and acceptance criteria are valid.
- Only one feature is active in the shared workstream.
- Active state agrees with `progress/current.md`.
- Review state has an implementation report.
- A completed tracked feature has implementation and review reports and a history entry.
- Required reports identify their feature and contain evidence sections.

A feature is tracked when it has a non-empty `issue` field. Completed bootstrap features without an issue predate the delivery workflow. The validator does not require fabricated reports for those legacy features.

The validator checks the presence and structure of evidence. It cannot prove that a recorded command ran or that a written claim is true. The command exit status and required remote CI check remain the trusted execution evidence.

After harness-state validation, the gate runs four complementary checks:

1. `pnpm run check` performs TypeScript type checking.
2. `pnpm run lint` applies type-aware ESLint rules and the repository's file-length limit.
3. `pnpm run analyze:changes` runs Fallow's new-only audit against the branch's merge base. It checks changed files for dead code, dependency problems, cycles, complexity, large functions, and duplication.
4. `pnpm test` runs both test layers:
   - `pnpm run test:product` checks the sample task CLI's behavior.
   - `pnpm run test:harness` generates isolated fixtures proving harness-state validation, ESLint, and Fallow reject representative policy violations and accept valid state.

Use `pnpm run analyze` when you need a full-codebase Fallow report rather than the changed-file merge gate. Its thresholds and CLI entry point are versioned in `.fallowrc.json`; duplication above 5% fails the analysis. The CRAP threshold is calibrated above Fallow's static estimates because this small Node test setup does not emit Istanbul coverage; cyclomatic, cognitive, and function-size limits remain independently enforced.

For a feature, add the smallest focused command that demonstrates its behavior, then run the full gate. CI checks out full Git history so Fallow can resolve the correct merge base.

Harness-state and Fallow contract fixtures are created under the operating system's temporary directory. The type-aware ESLint fixture is created within the test tree so TypeScript's project service can resolve it. Every fixture is removed in a `finally` block, so intentionally invalid state never remains in the repository or enters the normal pre-test analysis.

Record exact commands and exit results in the implementation report. A passing command run before a change is not evidence for the final state.
