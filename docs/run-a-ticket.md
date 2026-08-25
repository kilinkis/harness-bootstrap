# Run a Ticket Through the Harness

This walkthrough uses `TASK-003` and [GitHub Issue #1](https://github.com/kilinkis/harness-bootstrap/issues/1) as a concrete example. Use separate agent sessions when possible so planning, implementation, and review do not share mixed context. The durable handoff is the repository state and the reports in `progress/`.

Adapt the ticket ID and file references for your project. The prompts are intentionally tool-neutral.

## 1. Leader: select and plan the ticket

```text
Act as the leader for TASK-003. Follow AGENTS.md and read agents/leader.md,
feature_list.json, CHECKPOINTS.md, and the relevant project documentation.
Run the baseline verification gate. Confirm no other feature is active, set only
TASK-003 to in_progress, and write the acceptance criteria, implementation plan,
verification approach, and handoff to progress/current.md. Do not implement or
review the feature. Return a short status that points to the durable plan.
```

The leader should hand the implementer the ticket and file references, not a large paraphrase of the codebase.

## 2. Implementer: change code and prove it

```text
Act as the implementer for TASK-003. Follow AGENTS.md and read
agents/implementer.md, feature_list.json, progress/current.md, and the referenced
architecture, conventions, and verification docs. Implement only the accepted
scope from GitHub Issue #1: add `complete <task-id>` to the CLI, persist completed
status, and return a helpful non-zero error for an unknown ID. Add focused tests,
run the verification gate, and record files, exact commands, results, and risks in
progress/impl_TASK-003.md. Move TASK-003 to in_review only after that report is
complete. Do not review your own work or mark the ticket done.
```

The implementation report is the review handoff. It should contain evidence rather than a narrative of intent.

## 3. Reviewer: evaluate independently

```text
Act as the reviewer for TASK-003. Follow AGENTS.md and read agents/reviewer.md,
the ticket acceptance criteria, CHECKPOINTS.md, progress/impl_TASK-003.md, and the
implementation diff. Do not edit implementation files. Inspect behavior, failure
modes, scope, tests, and architecture invariants; run the verification gate
independently. Write progress/review_TASK-003.md with findings ordered by severity,
the commands and results, remaining risks, and an explicit approved or changes
requested verdict. Return only a short status pointing to the review report.
```

If the reviewer requests changes, send only the findings back through another implementer pass. After approval, the leader checks every item in `CHECKPOINTS.md`, marks the ticket `done`, clears or updates `progress/current.md`, and records the outcome in `progress/history.md`.
