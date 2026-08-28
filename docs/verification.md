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

This command validates harness state. It then checks types, lint rules, changed-file Fallow findings, and product behavior. It omits harness contract tests to reduce feedback time.

The fast command is not a completion or merge gate.

## Full gate

Run the full harness gate before completion and merge:

```bash
./scripts/verify.sh
```

The shell gate runs `pnpm run verify`. The full command composes `pnpm run feedback` with `pnpm run test:harness`. CI uses the same shell gate.

The feedback command first runs `pnpm run check:harness-state`. This command validates the feature queue and its durable evidence:

- Feature IDs, statuses, titles, and acceptance criteria are valid.
- Only one feature is active in the shared workstream.
- Active state agrees with `progress/current.md`.
- Review state has an implementation report.
- A completed tracked feature has implementation and review reports and a history entry.
- Required reports identify their feature and contain evidence sections.

A feature is tracked when it has a non-empty `issue` field. Completed bootstrap features without an issue predate the delivery workflow. The validator does not require fabricated reports for those legacy features.

The validator checks the presence and structure of evidence. It cannot prove that a recorded command ran or that a written claim is true. The command exit status and required remote CI check remain the trusted execution evidence.

After harness-state validation, the commands run complementary checks:

1. `pnpm run check` performs TypeScript type checking.
2. `pnpm run lint` applies type-aware ESLint rules and the repository's file-length limit.
3. `pnpm run analyze:changes` runs Fallow's new-only audit against the branch's merge base. It checks changed files for dead code, dependency problems, cycles, complexity, large functions, and duplication.
4. `pnpm run test:product` checks the sample task CLI's behavior in the fast loop.
5. `pnpm run test:harness` runs only in the full gate. It generates isolated fixtures proving harness-state validation, command composition, ESLint, and Fallow reject representative policy violations and accept valid state.

Use `pnpm run analyze` when you need a full-codebase Fallow report rather than the changed-file merge gate. Its thresholds and CLI entry point are versioned in `.fallowrc.json`; duplication above 5% fails the analysis. The CRAP threshold is calibrated above Fallow's static estimates because this small Node test setup does not emit Istanbul coverage; cyclomatic, cognitive, and function-size limits remain independently enforced.

For a feature, add the smallest focused command that demonstrates its behavior. Run the fast loop before review. Run the full gate on the final state. CI checks out full Git history so Fallow can resolve the correct merge base.

Harness-state and Fallow contract fixtures are created under the operating system's temporary directory. The type-aware ESLint fixture is created within the test tree so TypeScript's project service can resolve it. Every fixture is removed in a `finally` block, so intentionally invalid state never remains in the repository or enters the normal pre-test analysis.

Record exact commands and exit results in the implementation report. A passing command run before a change is not evidence for the final state.
