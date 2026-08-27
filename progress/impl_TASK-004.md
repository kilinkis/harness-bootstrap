# Implementation Report — TASK-004

## Scope

Added complementary code-quality gates: type-aware ESLint for local TypeScript rules and whole-file length, plus Fallow for dead code, dependency hygiene, cycles, duplication, complexity, and large functions. Integrated the changed-file audit into the standard harness gate and preserved a separate full-codebase report.

## Files changed

- `eslint.config.js`: recommended type-aware TypeScript rules and a 300-line file limit.
- `.fallowrc.json`: CLI entry point, duplication settings, complexity thresholds, function-size limit, and new-only audit behavior.
- `package.json`, `pnpm-lock.yaml`: ESLint, typescript-eslint, and Fallow dependencies and scripts.
- `.github/workflows/verify.yml`: full Git history for merge-base analysis.
- `.gitignore`: Fallow's machine-local cache.
- `src/tasks.ts`, `tests/*.test.ts`: explicit lint-safe behavior and blank-tag regression coverage.
- `src/cli.ts`, `tests/cli.test.ts`: lower-complexity argument parsing and malformed-option coverage.
- `docs/verification.md`: verification layers and focused command guidance.

## Commands and results

- `./scripts/verify.sh` before implementation: passed with 4 tests on `main` (required sandbox permission for the `tsx` IPC socket).
- `pnpm exec fallow recommend --format json`: detected TypeScript, pnpm, and a single-package repository; the proposed conventional entry point was replaced with the actual `src/cli.ts` entry.
- `pnpm run lint`: initially found seven existing issues; after explicit fixes, passed with zero warnings.
- `pnpm run check`: passed.
- `pnpm test`: passed with 7 tests after adding blank-tag and malformed-option coverage.
- `pnpm run analyze`: initially identified cognitive complexity in the CLI parser; after decomposition, passed with no dead code, duplication, or threshold violations.
- `pnpm run analyze:changes`: passed with no issues in 14 changed files (required sandbox permission to create Fallow's temporary base worktree).
- `pnpm audit --audit-level high`: no known vulnerabilities.
- `pnpm install --frozen-lockfile`: lockfile is current.
- Final `./scripts/verify.sh`: passed type checking, linting, changed-file analysis, and all 7 tests.

## Remaining risks

- The Node test setup does not emit Istanbul coverage, so `.fallowrc.json` raises only the CRAP threshold above Fallow's static estimates. Cyclomatic complexity, cognitive complexity, function size, and file size remain independently enforced.
- Fallow's new-only audit needs enough Git history to resolve a merge base; CI now uses `fetch-depth: 0` for that reason.
