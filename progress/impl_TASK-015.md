# Implementation Report — TASK-015

## Scope

Added a bounded repair protocol for deterministic verification failures. It limits repeated corrections and defines evidence, retry, stop, and escalation rules.

## Files changed

- Added `docs/repair-loop.md` with the three-attempt budget and report format.
- Linked the guide from `AGENTS.md`, the implementer role, the ticket runbook, and verification guidance.
- Added `tests/harness/repair-loop.test.ts` to protect the budget, stop conditions, limitation statement, and entry points.
- Updated feature state and reports.
- Replaced per-error budgets with one total repair-cycle budget after review.

## Commands and results

- `pnpm exec tsx --test tests/harness/repair-loop.test.ts` passed 3 tests before the review fix.
- `pnpm run check` passed.
- `pnpm run lint` passed.
- `pnpm run analyze:changes` passed with no findings.
- `./scripts/verify.sh` passed 7 product tests and 34 harness tests.

## Remaining risks

- Repository checks cannot detect repair attempts that an agent does not record.
- The protocol depends on the reviewer comparing reported attempts with available output and history.
