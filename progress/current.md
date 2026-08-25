# Current Session — TASK-003

## Objective

Complete [GitHub Issue #1](https://github.com/kilinkis/harness-bootstrap/issues/1): let a user mark a persisted task as completed from the CLI, return a useful error for an unknown ID, and document the prompts used for each harness role.

## Acceptance criteria

- The CLI accepts a task ID for completion.
- Completing an existing open task persists its completed status.
- An unknown task ID returns a helpful non-zero error.
- The repository contains reusable leader, implementer, and reviewer prompts for this ticket.

## Plan

1. Add the completion state transition to `src/tasks.ts`.
2. Add a `complete <task-id>` command to `src/cli.ts` and persist the result through `src/storage.ts`.
3. Cover successful completion and unknown-ID behavior in focused tests.
4. Add the example ticket workflow and prompts to `docs/run-a-ticket.md`.
5. Run `./scripts/verify.sh` and record the evidence in `progress/impl_TASK-003.md`.
6. Hand the implementation report and diff to an independent reviewer.

## Ownership and handoff

- Current owner: leader
- Next owner: implementer
- Verification gate: `./scripts/verify.sh`
- Expected implementation report: `progress/impl_TASK-003.md`
- Expected review report: `progress/review_TASK-003.md`
