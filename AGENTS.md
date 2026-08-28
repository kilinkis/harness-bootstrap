# Agent Guide

This repository is a harness: follow the system before changing the product.

## Start here

1. Run `./scripts/verify.sh`.
2. Read `feature_list.json`; select the first `pending` item unless directed otherwise.
3. Read `docs/architecture.md`, `docs/conventions.md`, and the selected feature's acceptance criteria.
4. Read the relevant role definition in `agents/` before taking that role.

## Operating rules

- Work on exactly one feature at a time. Do not start a second active item.
- Treat acceptance criteria as the contract. Clarify or update the feature before coding if they are insufficient.
- Keep durable state in `progress/`, not only in conversation.
- Do not mark work done based on intent. Run verification and record its output.
- Preserve unrelated user changes. Never rewrite history or delete data to make a check pass.
- A reviewer reports findings but does not edit implementation files.
- Follow the technical prose rules in `docs/conventions.md` for durable repository text.

## Delivery workflow

- Track every non-trivial change in a work item with explicit acceptance criteria.
- Create a feature branch from the default branch; do not commit directly to the protected branch.
- Open a pull or merge request that links the work item using the platform's closing syntax.
- Include implementation and review reports, verification evidence, and remaining risks in the request.
- Merge only after the completion checkpoints and required remote checks pass.

## Navigation

| Need | Read |
| --- | --- |
| System design and boundaries | `docs/architecture.md` |
| Style and error-handling rules | `docs/conventions.md` |
| Commands and evidence required | `docs/verification.md` |
| Ticket-to-merge workflow | `docs/run-a-ticket.md` |
| GitHub templates and remote setup | `docs/github-setup.md` |
| Optional MCP capabilities and safety | `docs/optional-mcp.md` |
| Completion gate | `CHECKPOINTS.md` |
| Current session state | `progress/current.md` |
| Previous decisions | `progress/history.md` |

## Report convention

Use `progress/impl_<feature-id>.md` and `progress/review_<feature-id>.md`. Include: scope, files changed or inspected, commands run with results, and any remaining risks. Keep chat responses to a short pointer to the report.
