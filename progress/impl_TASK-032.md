# Implementation Report: TASK-032

## Scope

Document a minimal manual adoption path and verify the guarded project extension in a fresh fixture without sample product state. This implements assessment R9 and issue #65. It adds no generator or orchestration framework and leaves metrics and impact analysis optional.

## Files changed

- `docs/adoption-map.md`: provides a 61-line copy/adapt/omit/optional map, runtime and dependency-install steps, Git comparison prerequisites, both historical-map adaptations, guarded local/CI delivery, and explicit fixture limits.
- `README.md`: links the map and puts runtime and locked installation prerequisites before first-run feedback. Final local and CI commands use their documented phases.
- `ADOPTION_CHECKLIST.md`: links the map and corrects the negative-build procedure so a phase or snapshot rejection is not mistaken for evidence that a project build executed.
- `docs/adoption-handoff.md`: links the map at the adoption entry point.
- `tests/harness/minimal-adoption.test.ts`: creates an isolated project with copied core guards, both historical maps cleared, an empty queue, its own target inventory, and its own configuration check and artifact contract. It copies no sample source or work-item history. It checks local/CI success, deliberate project failure, unfinished-work rejection, and tracked snapshot rejection.
- `feature_list.json` and `progress/current.md`: record the final feature's review handoff.

Added test lines total 117, below the 300-line implementation target. No production source, sample product, or historical reports changed.

## Commands and results

- Startup `pnpm run feedback`: passed all fast checks and 7 product tests.
- Inspected `package.json` and `.github/workflows/verify.yml`: confirmed the checked-in pnpm 10.34.5, Node 24, frozen-lockfile install, full checkout history, CI comparison input, and `verify.sh ci` settings used in the guide.
- `pnpm exec tsx --test tests/harness/minimal-adoption.test.ts`: established the documentation regression. The fresh project behavior passed; the primary-entry map contract failed because the map links did not exist.
- `pnpm exec tsx --test tests/harness/minimal-adoption.test.ts tests/harness/adoption-guidance.test.ts tests/harness/verification-loop.test.ts`: passed all 10 focused contracts after the guide and links were added. The final run also explicitly checks empty historical maps and nonzero active/snapshot failures.
- Final `pnpm run feedback`: passed state, release, review binding, target inventory, TypeScript, ESLint, explicit-base Fallow analysis, and all 7 product tests. Comparison used `origin/main` at `db63e0c09b539bb48f4840c934fcdb71b946a35e`.
- `git diff --cached --check`: passed. Inspected the staged map, entry links, negative-build procedure, and fixture.
- `pnpm run review:digest`: passed and produced the digest below.

The fixture executes actual copied delivery, state, release, review-binding, and target-inventory commands. The project command reads `project.json`, checks it against a controlled environment input, and writes an artifact. Its later contract reads the artifact. Invalid project input produces `PROJECT_CONFIGURATION_INVALID` and prevents the later contract in both local and CI phases.

Fallow reported the inherited duplication between the existing local and impact option parsers. Its unchanged new-only gate excluded that inherited finding and passed. No unrelated cleanup was made.

The implementer did not run the full repository gate, commit, push, or merge. Gate execution was limited to the deliberately small fresh-project fixture.

## Repair attempts

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Focused minimal-adoption, adoption-guidance, and verification-loop contracts; then `pnpm run feedback` | Primary adoption entry points lacked a copy/adapt/omit/optional map and first-run prerequisites. | Added the map and links, aligned first-run and negative-build guidance with the guarded gate, and retained the passing real project fixture. | All 10 focused contracts and fast feedback passed. |

## Review binding

Intended implementation files were staged before handoff. Queue and progress evidence retain their documented digest exclusions. Existing `output/` and `tmp/` artifacts remain untracked and untouched.

Implementation digest: sha256:49b8947bba8f1e532598d059827c73f18f92eadc04d28fd758de14a93d9a3ba6

## Remaining risks

The minimal fixture reuses installed dependencies through a temporary symlink. It does not prove a fresh install or a production build. TypeScript, ESLint, Fallow, and the full copied harness suite are omitted from its composition, not replaced with passing stubs. With an empty queue, actual binding validation has no completed approval to validate. Existing focused suites cover normal approval binding.

Adopters still need to adapt their actual commands, approve target coverage, obtain review, and run the target repository's required checks. An empty queue is not evidence that adoption or product readiness is complete. Runtime and package-manager choices must stay aligned with the adopted workflow and manifest.

Publication remains blocked by the earlier automatic approval review decision recorded in `progress/current.md`. No publication retry was made.

## Leader verification

After independent approval, `./scripts/verify.sh` exited 0 on the approved snapshot. All fast checks, 7 product tests, and 102 harness contracts passed. Queue and progress evidence were finalized without changing implementation content.

After evidence finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery` and `pnpm run check:harness-state` passed.


## CI repair integration

Integrated the independently reviewed fixture correction from TASK-031. The only implementation delta from the original TASK-032 HEAD is the same 3 added lines in `tests/harness/local-verification.test.ts`. The staged and incoming blobs both equal `84c631e75c1e084ab3a0541d58b2df76c70555c7`. No production code or new source changes were made.

- `HARNESS_BASE_REF=1111111111111111111111111111111111111111 pnpm exec tsx --test tests/harness/local-verification.test.ts`: all 6 contracts passed.
- `pnpm run feedback`: all fast checks and 7 product tests passed; the inherited parser duplication remained excluded normally.
- `git diff --cached --check`: passed. No unstaged implementation differences remain.
- `pnpm run review:digest`: produced the revised implementation digest above.

The previous approved digest was `sha256:189d8b8632048461cd2eeeffc1b37d90738cb182840fec5f313745e292961ff4`. The old canonical approval remains unchanged for independent preservation and renewal. The leader must run the final gate with the real CI base and require green remote checks. Publication is now authorized; the earlier blocked note records the original implementation context. No full gate, commit, push, or unrelated artifact changes occurred during this integration handoff.

## Leader CI-repair verification

After renewed independent approval, `HARNESS_BASE_REF=db63e0c09b539bb48f4840c934fcdb71b946a35e ./scripts/verify.sh` exited 0. All fast checks, 7 product tests, and 102 harness contracts passed. This repeats the final gate because the CI-discovered fixture repair changed the approved implementation snapshot. Only evidence was finalized afterward.

After renewed evidence finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery` and `pnpm run check:harness-state` passed.
