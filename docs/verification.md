# Verification

Run the full harness gate from the repository root:

```bash
./scripts/verify.sh
```

The gate validates `feature_list.json`, then runs four complementary checks:

1. `pnpm run check` performs TypeScript type checking.
2. `pnpm run lint` applies type-aware ESLint rules and the repository's file-length limit.
3. `pnpm run analyze:changes` runs Fallow's new-only audit against the branch's merge base. It checks changed files for dead code, dependency problems, cycles, complexity, large functions, and duplication.
4. `pnpm test` runs the Node test suite.

Use `pnpm run analyze` when you need a full-codebase Fallow report rather than the changed-file merge gate. Its thresholds and CLI entry point are versioned in `.fallowrc.json`. The CRAP threshold is calibrated above Fallow's static estimates because this small Node test setup does not emit Istanbul coverage; cyclomatic, cognitive, and function-size limits remain independently enforced.

For a feature, add the smallest focused command that demonstrates its behavior, then run the full gate. CI checks out full Git history so Fallow can resolve the correct merge base.

Record exact commands and exit results in the implementation report. A passing command run before a change is not evidence for the final state.
