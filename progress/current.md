# Current Session

## TASK-005 — Add contract tests for quality gates

Status: `in_progress`

Issue: https://github.com/kilinkis/harness-bootstrap/issues/3

Objective: prove the harness policies detect representative violations and accept clean code, independently of the demo product tests.

Plan:

1. Add an ESLint contract test that uses the repository configuration against generated oversized TypeScript source.
2. Add isolated Fallow fixtures for health, duplication, and a clean baseline, asserting exit status and JSON fields.
3. Split product and harness test scripts while keeping both in the standard verification gate.
4. Document, verify, review, and deliver through a pull request.

Anticipated files: `tests/harness/`, `package.json`, `docs/verification.md`, and `progress/` reports.

Verification: `pnpm run test:product`, `pnpm run test:harness`, `pnpm test`, and `./scripts/verify.sh`.

Owner: implementer.

Next handoff: reviewer after implementation evidence is complete.
