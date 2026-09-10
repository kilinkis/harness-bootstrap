# Harness improvements — 2026-09-10

## Outcome

Implemented all nine findings from the original bootstrap assessment as separately reviewed work items TASK-024 through TASK-032. Each item received independent focused review and a final local full gate before completion. The sample product is unchanged. No generator, agent runtime, or orchestration framework was added.

The complete local implementation is on `codex/TASK-032-minimal-adoption`. The earlier assessment remains unchanged as a historical record. This report records the resulting implementation.

## Changes

| Finding | Priority | Implemented result | Evidence |
| --- | --- | --- | --- |
| R1 | P1 | Maintenance approvals use an immutable committed review baseline and survive default-branch advancement. Staged maintenance contents are checked. | [TASK-024 implementation](impl_TASK-024.md), [review](review_TASK-024.md) |
| R2 | P1 | Workspace discovery parses YAML and rejects invalid configuration instead of silently omitting packages. | [TASK-025 implementation](impl_TASK-025.md), [review](review_TASK-025.md) |
| R3 | P1 | One designated final report supplies approval and evidence. Numbered rounds cannot override it. Exact historical approvals remain preserved. | [TASK-026 implementation](impl_TASK-026.md), [review](review_TASK-026.md) |
| R4 | P1 | Final local verification requires approval. CI requires completed state. Development feedback remains available during implementation. | [TASK-027 implementation](impl_TASK-027.md), [review](review_TASK-027.md) |
| R5 | P2 | Fallow and selectors receive an explicit target/common-ancestor baseline. CI provides event-specific inputs; first pushes run full analysis. | [TASK-028 implementation](impl_TASK-028.md), [review](review_TASK-028.md) |
| R6 | P2 | Reusable contracts accept verify:project while protecting required stages, order, and failure propagation. | [TASK-029 implementation](impl_TASK-029.md), [review](review_TASK-029.md) |
| R7 | P2 | Final verification rejects tracked working-tree implementation that differs from the reviewed index, with the same evidence exclusions. | [TASK-030 implementation](impl_TASK-030.md), [review](review_TASK-030.md) |
| R8 | P2 | Only three exact original definitions retain the legacy evidence exemption. New completed work requires a local or remote reference and normal evidence. | [TASK-031 implementation](impl_TASK-031.md), [review](review_TASK-031.md) |
| R9 | P2 | A minimal adoption map identifies what to copy, adapt, omit, and use optionally, with an executable project-check fixture. | [TASK-032 implementation](impl_TASK-032.md), [review](review_TASK-032.md) |

## Verification

The final `./scripts/verify.sh` exited 0 after independent TASK-032 approval. All fast checks, 7 product tests, and 102 harness contracts passed. After evidence-only finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery` and `pnpm run check:harness-state` also passed.

Each preceding work item has its own focused, independent review, and final-gate results in the linked reports. The final gate includes regressions for merged maintenance, YAML workspace discovery, canonical approval, delivery state, comparison bases, project-stage failures, staged/working-tree consistency, explicit historical exemptions, and fresh adoption.

The script changes add 170 net runtime lines across the nine fixes. Most new implementation lines are regression tests. The sample source and product tests are unchanged. See the [minimal adoption map](../docs/adoption-map.md) for the resulting first-run workflow.

## Scope and remaining limits

- New runtime dependency: yaml 2.9.0, used for workspace parsing.
- Intended new implementation files must be staged before review. Final verification assumes a normal full checkout and no concurrent edits; it is not an isolated execution environment.
- Normal change analysis needs the intended Git target and common history. First-push full analysis may expose inherited findings in an adopted project.
- The harness validates evidence content. It does not establish reviewer identity, production build coverage for an arbitrary adopter, or product readiness.
- Existing untracked output/ and tmp/ user artifacts remain untouched.

## Publication

All nine fixes are complete locally. GitHub issues #57 through #65 track them. No fix branch was pushed and no pull request was opened. Automatic approval review rejected the first push because external transfer to the GitHub remote requires explicit user authorization. That request remains pending; the rejected action was not retried. Remote CI and merge completion therefore remain unverified.
