# Implementation Report: TASK-027

## Scope

Add explicit local and CI delivery phases to the full gate. Development feedback remains available during implementation. The local full gate requires implementation to reach review and pass the existing approval and binding checks. CI requires finalized feature state before running the same validation pipeline.

This implements assessment R4 and issue #60. Comparison-base selection, project command extension, and working-tree/index consistency remain assigned to TASK-028 through TASK-030.

## Files changed

- `scripts/check-delivery.ts`: rejects in-progress delivery locally and any active feature in CI. It makes only the phase decision; existing state and binding validators retain schema, evidence, approval, and digest validation.
- `scripts/verify.sh`: accepts `local` or `ci`, defaults to local, rejects unknown phases, and explicitly forwards its phase through `HARNESS_DELIVERY_PHASE`.
- `package.json`: guards direct `pnpm run verify` before its existing feedback and harness-test composition.
- `.github/workflows/verify.yml`: runs `./scripts/verify.sh ci` against finalized state.
- `tests/harness/delivery-gate.test.ts`: exercises the actual shell, package composition, phase guard, state validator, and binding validator in temporary Git fixtures. Only expensive unrelated checks and the recursive harness-test command are stubbed.
- `tests/harness/verification-loop.test.ts`: protects the guarded composition, CI phase, and reviewer entry guidance.
- `AGENTS.md`, `agents/reviewer.md`, `agents/leader.md`, `docs/run-a-ticket.md`, and `docs/verification.md`: distinguish development, reviewer entry, approved local verification, and finalized CI verification.
- `feature_list.json` and `progress/current.md`: record the handoff. Later work items remain pending.

Added source and test lines total 171, including the shell entrypoint. The implementation remains below the 300-line target. No historical review report was changed.

## Commands and results

- `pnpm exec tsx --test tests/harness/delivery-gate.test.ts`: established the baseline failure. Three of five contracts failed: full local verification accepted in-progress work, CI accepted unfinalized review state, and the shell ignored an unknown phase.
- `pnpm exec tsx --test tests/harness/delivery-gate.test.ts tests/harness/verification-loop.test.ts`: all 9 contracts passed after phase integration. They cover direct and shell verification, missing approval, approved local review before finalization, completed CI state, permitted maintenance, stale code, and invalid phase input.
- `node --import tsx --test tests/harness/verification-loop.test.ts tests/harness/adoption-guidance.test.ts tests/harness/repair-loop.test.ts`: all 10 documentation-facing contracts passed after the role and verification updates.
- `pnpm run feedback`: initially failed on unsafe member access in the new guard because `Array.isArray` narrows to `any[]`. Applied the narrow type correction recorded below.
- `pnpm exec eslint scripts/check-delivery.ts --max-warnings=0`: passed after the correction.
- `pnpm run feedback`: passed state, release, binding, target inventory, TypeScript, ESLint, Fallow changed-file analysis, and all 7 product tests while TASK-027 remained in progress.
- `git diff --cached --check`: passed. Inspected the staged entrypoint, command, workflow, and implementation diffs.
- `pnpm run review:digest`: passed and produced the digest below.

The entrypoint contracts run isolated fixtures with explicit stubs. They do not constitute the leader-owned full gate on this repository. The implementer did not run that full gate, commit, push, or merge.

## Repair attempts

The initial focused command established the failure before implementation.

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `pnpm exec tsx --test tests/harness/delivery-gate.test.ts tests/harness/verification-loop.test.ts` | Local and CI entrypoints allowed unfinished states and ignored invalid phases. | Added the phase guard, guarded direct verification, and passed an explicit CI phase through the shell. | All 9 contracts passed. Subsequent feedback exposed unsafe member access in the new guard. |
| 2 | `pnpm exec eslint scripts/check-delivery.ts --max-warnings=0`, then `pnpm run feedback` | ESLint reported three `.status` accesses on `any` after the array check. | Retained `unknown[]` after validating the queue as an array so object-property narrowing remains type-safe. | Focused lint and fast feedback passed. |

## Review binding

The intended implementation files were staged before handoff. Queue and progress evidence retain their documented digest exclusions. Existing `output/` and `tmp/` artifacts remain untracked and untouched.

Implementation digest: sha256:40bcb184a7f3aea132f8ded651b1d4c8551c2a42b485940f6970c9f415dfbe4a

## Remaining risks

`check:delivery` alone checks the phase decision. Approval and evidence are established by the subsequent existing validators in the guarded full command. Do not treat the standalone phase command as full verification.

Repository checks cannot prove reviewer identity or actual remote approval. Required remote controls remain necessary. Local verification defaults to the local phase; the checked-in CI entry explicitly selects CI and rejects unfinished evidence.

Publication remains blocked by the earlier automatic approval review decision recorded in `progress/current.md`. No publication retry was made.

## Leader verification

After independent approval, `./scripts/verify.sh` exited 0 on the approved snapshot. All fast checks, 7 product tests, and 85 harness contracts passed. Queue and progress evidence were finalized without changing implementation content.

After finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery` and `pnpm run check:harness-state` both exited 0. This confirmed CI-ready phase and evidence without repeating the full gate.
