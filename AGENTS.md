# Agent Guide

This repository is a harness: follow the system before changing the product.

## Start here

1. Run `pnpm run feedback` at implementation startup unless this snapshot and environment already passed. Reviewers start with `agents/reviewer.md` and independent focused checks.
2. Read `feature_list.json`; select the first `pending` item unless directed otherwise.
3. Read `docs/architecture.md`, `docs/conventions.md`, and the selected feature's acceptance criteria.
4. Read the relevant role definition in `agents/` before taking that role.

When you adapt this harness to another repository, complete `ADOPTION_CHECKLIST.md` before you treat the gate as production-ready.

## Operating rules

- Default to one implementer who plans and finalizes, plus one independent reviewer. A separate coordinator is optional.
- Work on exactly one feature at a time. Do not start a second active item.
- Treat acceptance criteria as the contract. Clarify or update the feature before coding if they are insufficient.
- Keep durable state in `progress/`, not only in conversation.
- Do not mark work done based on intent. Run verification and record its output.
- Preserve unrelated user changes. Never rewrite history or delete data to make a check pass.
- A reviewer reports findings but does not edit implementation files.
- Bind approval to the staged implementation with `docs/review-binding.md`.
- Follow `docs/repair-loop.md` after a verification failure. Stop after its repair budget is exhausted.
- Follow the technical prose rules in `docs/conventions.md` for durable repository text.
- Use the low-risk documentation lane in `docs/run-a-ticket.md` only when the automatic classifier approves every changed path.
- For harness adoption, follow `docs/adoption-handoff.md`: separate harness adoption, project-gate adoption, and product readiness, then hand off the first actionable readiness item.

## Delivery workflow

- Track every non-trivial change in a work item with at most five acceptance criteria.
- Target at most 300 added implementation lines; record a named owner and reason for exceptions. Keep cohesive fixes in one item and PR. Split independently verifiable outcomes; finish delivery before starting dependent work.
- Create a feature branch from the default branch; do not commit directly to the protected branch.
- For normal work, open a pull or merge request that links the work item with closing syntax. Record the classifier result instead for the low-risk documentation lane.
- For normal changes, include implementation and review reports, verification evidence, and remaining risks in the request.
- The implementer runs focused and fast checks. The reviewer runs independent focused checks. After approval, the same implementer runs the one final local full gate and finalizes evidence.
- Merge only after the completion checkpoints and required remote checks pass.

## Context and evidence cost

Start with active criteria, current state, and the relevant diff. Load referenced files as needed. Hand off paths, digest, changed scope, and unresolved questions; do not copy whole histories.

Record commands, outcomes/counts, and material risks, with only necessary error excerpts. Reference raw logs. Repeat deterministic checks only for changed code, environment, or new evidence; independent review and the final approved gate remain required.

## Navigation

| Need | Read |
| --- | --- |
| System design and boundaries | `docs/architecture.md` |
| Sample product usage | `docs/task-cli.md` |
| Style and error-handling rules | `docs/conventions.md` |
| Commands and evidence required | `docs/verification.md` |
| Failed verification repair loop | `docs/repair-loop.md` |
| Review-to-implementation binding | `docs/review-binding.md` |
| Harness releases and upgrades | `docs/upgrading.md` |
| Optional affected-target analysis | `docs/impact-analysis.md` |
| Ticket-to-merge workflow | `docs/run-a-ticket.md` |
| Harness adoption and build coverage | `ADOPTION_CHECKLIST.md` |
| Optional parallel worktrees | `docs/parallel-worktrees.md` |
| Production-readiness adoption | `docs/production-readiness.md` |
| Approved verification targets | `docs/target-inventory.md` |
| GitHub templates and remote setup | `docs/github-setup.md` |
| Optional MCP capabilities and safety | `docs/optional-mcp.md` |
| Completion gate | `CHECKPOINTS.md` |
| Current session state | `progress/current.md` |
| Previous decisions | `progress/history.md` |

## Report convention

For normal work, use `progress/impl_<feature-id>.md` for implementation. Use numbered review files for change requests. Reserve `progress/review_<feature-id>.md` for final approval. Include: scope, files changed or inspected, commands run with results, and any remaining risks. Every review report must include the implementation digest from `docs/review-binding.md`. The approved low-risk documentation lane does not create local progress reports. Keep chat responses to a short pointer to the report.
