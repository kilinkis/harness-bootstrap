# Implementation Report: TASK-040

Work item: https://github.com/kilinkis/harness-bootstrap/issues/96

Implementation digest: sha256:bc78de486934a698fb774c698455e1911ac2ca5c0cf733ce9fc9728f4b3aae95

## Scope

Add a tool-agnostic model routing policy. The policy defines three cost tiers (`low`, `standard`, `high`) and four task tiers (`explore-report`, `implement`, `review`, `risky-review`). Each role has a default task tier. Review escalates to `risky-review` on listed path patterns or conditions. The core names no vendor, tool, or model.

The issue named three task tiers. This change adds a separate `review` tier for normal diffs, so that only triggered reviews use the `high` cost tier.

## Files changed

- `harness.models.json`: cost tiers, task tiers, role defaults, and risky-review triggers.
- `docs/model-routing.md`: policy, role defaults, and escalation rules.
- `docs/model-adapters.md`: optional mapping template for a specific tool.
- `agents/implementer.md`, `agents/reviewer.md`, `agents/leader.md`: `Model tier` line for each role.
- `AGENTS.md`, `docs/adoption-map.md`: operating rule, navigation rows, and adoption decisions.
- `tests/harness/model-routing.test.ts`: config shape, role consistency, and vendor neutrality.

## Commands and results

- `pnpm run feedback` at startup: passed.
- `npx tsx --test tests/harness/model-routing.test.ts tests/harness/adoption-guidance.test.ts`: 4 passed, 0 failed.
- `pnpm run feedback` on the staged change: passed (state, release, binding, and inventory valid; lint clean; 7 product tests passed).
- `pnpm run test:harness`: 107 passed, 0 failed.
- Independent review approved the same digest: `progress/review_TASK-040.md`.
- Final gate `./scripts/verify.sh` on the approved snapshot: passed, 7 product and 107 harness tests.
- After finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery` and `pnpm run check:harness-state` passed.

## Remaining risks

- The policy is advisory. No script selects a model. Each tool applies it through its own configuration or adapter.
- Risky-review triggers are not checked automatically. The implementer records the review tier in the report.

Review tier: risky-review (trigger: harness.*.json)
