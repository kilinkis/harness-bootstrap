# Implementation Report — TASK-012

## Scope

Added an obvious harness-adoption checklist for target coverage, production builds, deployment parity, and negative failure proof. Added a tool-neutral project verification extension point and contracts that keep the guidance visible.

## Files changed

- `ADOPTION_CHECKLIST.md` defines the required adoption audit and evidence tables.
- `README.md` displays the checklist near the repository introduction and links it from adoption guidance and the repository map.
- `AGENTS.md` makes the checklist part of adoption instructions and navigation.
- `docs/verification.md` defines the project-owned verification extension point and negative test.
- `docs/production-readiness.md` establishes adoption coverage as the baseline before product-specific gates.
- `.github/pull_request_template.md` requests deployable-target, build, preview, and smoke-test evidence.
- `tests/harness/adoption-guidance.test.ts` protects checklist content and entry-point links.
- `feature_list.json` and `progress/current.md` record TASK-012 state.

## Commands and results

- `./scripts/verify.sh` before implementation: passed with 7 product tests and 14 harness tests.
- `pnpm exec tsx --test tests/harness/adoption-guidance.test.ts`: passed 2 tests.
- `git diff --check`: passed.
- `./scripts/verify.sh`: passed harness-state validation, type checking, lint, changed-file Fallow analysis, 7 product tests, and 16 harness tests.

## Remaining risks

The contracts prove that the bootstrap retains the adoption requirements. They cannot prove that an adopted repository selected complete or correct project commands. The target repository must complete the checklist, execute its production builds, and record a deliberate failing run.
