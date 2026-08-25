# Architecture

## Purpose

The sample product is a local TypeScript task CLI. It exists to demonstrate a harness around real code, not to be a complete task manager.

## Boundaries

`src/tasks.ts` owns task validation and state transitions. `src/storage.ts` owns JSON file I/O and atomic writes. `src/cli.ts` owns argument parsing, presentation, and process exit codes. Tests use a temporary data path and must not write to a developer's default store.

## Data model

A task is a JSON object with `id`, `title`, `tag`, and `status`. IDs are UUID strings. Status is currently `open` or `completed`.

## Invariants

- A task title is non-empty after trimming whitespace.
- The task store is a JSON array.
- Writes are atomic: a complete replacement file is written before it replaces the old store.
- Domain code raises `ValueError` for invalid user-facing state; the CLI turns it into a readable error and non-zero exit code.

## Harness boundaries

The queue defines work scope. Progress reports supply auditability. `scripts/verify.sh` is the acceptance gate; conversation claims are not verification evidence.
