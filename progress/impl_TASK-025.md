# Implementation Report: TASK-025

## Scope

Replace the partial pnpm workspace YAML parser so comments cannot hide packages. Validate the complete package list before discovery. Invalid configuration now produces a stable finding that also fails the target-inventory gate.

This implements assessment finding R2 and issue #58. Discovery remains specific to pnpm. Existing repository-boundary checks and unsupported exclusion-pattern findings remain in place.

## Files changed

- `scripts/adoption-target-discovery.ts`: parses one YAML document, checks parser errors and warnings, and requires a non-empty list of non-empty single-line strings. Invalid parsing or list shape produces `WORKSPACE_CONFIG_INVALID` without using a partial list.
- `package.json` and `pnpm-lock.yaml`: add the development dependency `yaml` at version 2.9.0. The accepted work-item plan justified a maintained parser instead of extending the partial parser. The package adds no transitive dependencies.
- `tests/harness/workspace-discovery.test.ts`: covers comments between package entries, block and flow lists, quoted hash characters, invalid configuration, undeclared targets, and unsupported exclusions through adoption and inventory interfaces.
- `docs/target-inventory.md` and `ADOPTION_CHECKLIST.md`: define and link the supported workspace-discovery contract.
- `feature_list.json` and `progress/current.md`: record the review handoff. Later work items remain pending.

Added script and test lines total 136. The implementation remains below the 300-line target.

## Commands and results

- `node --import tsx --test tests/harness/workspace-discovery.test.ts`: all 5 new contracts failed before implementation. The parser omitted `packages/shared` after a top-level comment, and an inventory missing that target did not receive a finding.
- `pnpm add --save-dev 'yaml@^2'`: succeeded and installed yaml 2.9.0. Only the direct dependency and its lockfile entries changed. The package manager reported that the existing esbuild build script remained disabled; no approval setting was changed.
- `node --import tsx --test tests/harness/workspace-discovery.test.ts`: all 5 contracts passed after the implementation.
- `pnpm exec tsx --test tests/harness/workspace-discovery.test.ts tests/harness/adoption-audit.test.ts tests/harness/adoption-inventory.test.ts tests/harness/adoption-guidance.test.ts`: all 23 focused contracts passed. Existing read-only audit behavior, unsafe-path handling, unresolved patterns, and adoption guidance remained valid.
- `pnpm run feedback`: passed state, release, binding, target inventory, TypeScript, ESLint, Fallow changed-file analysis, and all 7 product tests.
- `git diff --cached --check`: passed. Inspected the staged implementation and dependency diff.
- `pnpm run review:digest`: passed and produced the digest below.

The implementer did not run the full gate, commit, push, or merge. Independent review and the leader's final full gate remain required.

## Repair attempts

The initial focused command established the failure before implementation.

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `node --import tsx --test tests/harness/workspace-discovery.test.ts` | All 5 new contracts failed. The line scanner stopped at comments, rejected flow lists, and used partial malformed lists. | Replaced the scanner with documented YAML parsing and validated the complete list before discovery. | All 5 contracts passed. The expanded 23-test focused suite and fast feedback also passed. |

## Source verification

Used the source-driven-development skill for the new dependency. The [official yaml 2 document API](https://eemeli.org/yaml/#parsing-documents) documents `parseDocument` and its error and warning arrays. It reports multiple documents as an error. The implementation checks both arrays before calling `toJS`. The [document conversion options](https://eemeli.org/yaml/#tojs-options) define a default alias-expansion limit of 100; the implementation preserves that limit. Parser warnings about unsupported tags or directives become an explicit configuration finding instead of permitting fallback interpretation.

## Review binding

The intended implementation files were staged before handoff. Queue and progress evidence retain their documented digest exclusions. Existing `output/` and `tmp/` artifacts remain untracked and untouched.

Implementation digest: sha256:a915d4013b7b639db3b94d81fa60a8fe4a821d6b65e9474bbba99510bfaff6d1

## Remaining risks

The audit still reports exclusion patterns as unsupported. It does not implement the complete pnpm package-selection language or other package managers. Unsupported parser warnings fail closed, including warnings in unrelated workspace settings. The support contract makes this boundary explicit.

The new parser is a development dependency needed by adoption and inventory commands. Adopters must install the declared development dependencies before running the harness.

Publication remains blocked by the earlier automatic approval review decision recorded in `progress/current.md`. No publication retry was made.

## Leader verification

After independent approval, `./scripts/verify.sh` exited 0 on the approved snapshot. All fast checks, 7 product tests, and 76 harness contracts passed. Queue and progress evidence were finalized without changing implementation content.
