# Implementation Report — TASK-005

## Scope

Added contract tests for the harness quality policies. The tests exercise the real ESLint configuration and Fallow's JSON CLI against generated fixtures, while keeping the demo product tests as a separate layer. Fallow duplication above 5% now fails instead of remaining advisory.

## Files changed

- `tests/harness/quality-gates.test.ts`: oversized-file, complexity, duplication, and clean-fixture contracts.
- `.fallowrc.json`: 5% duplication failure threshold.
- `package.json`: separate `test:product` and `test:harness` scripts, both composed by `pnpm test`.
- `docs/verification.md`: test-layer and fixture-lifecycle documentation.

## Commands and results

- `./scripts/verify.sh` before implementation: passed with 7 product tests.
- `pnpm run lint`: passed after implementation.
- `pnpm run check`: passed after implementation.
- First `pnpm run test:harness`: 2 passed and 2 failed, revealing that type-aware ESLint needed an on-disk project fixture and that duplication was advisory with a zero threshold.
- Second `pnpm run test:harness`: 3 passed and 1 failed, correctly identifying a typed-lint violation in the intended clean fixture.
- Final `pnpm run test:harness`: all 4 contract tests passed.
- `pnpm test`: all 7 product tests and all 4 harness contract tests passed.
- `pnpm run analyze`: passed with no dead code, duplication, or health findings over threshold.
- Final `./scripts/verify.sh`: passed queue validation, type checking, linting, changed-file Fallow audit, 7 product tests, and 4 harness tests.

## Remaining risks

- The ESLint fixture must briefly exist under `tests/harness/` so typescript-eslint's project service can resolve it. A `finally` block removes it even when assertions fail.
- Contract tests intentionally cover representative policy families rather than every Fallow rule, avoiding brittle tests of Fallow's own implementation.
