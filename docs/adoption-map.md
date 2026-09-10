# Minimal Adoption Map

Use this map before the [adoption checklist](../ADOPTION_CHECKLIST.md). Preserve the target project's product, stack, and existing history. This is a manual adaptation guide, not a generator.

| Action | Files or capability | Decision |
| --- | --- | --- |
| Copy | `scripts/verify.sh`, core `scripts/*.ts`, `harness.targets.schema.json`, `HARNESS_VERSION`, `HARNESS_CHANGELOG.md` | Keep the state, release, review, delivery, inventory, and change-analysis validators with their imported helpers. Optional script groups are listed below. Release records describe the harness version; they are not sample work-item evidence. |
| Copy and adapt | `AGENTS.md`, `agents/`, `CHECKPOINTS.md`, workflow and verification guides in `docs/`, `tests/harness/` and fixture helpers | Preserve role boundaries, repair limits, evidence requirements, required stages, and failure tests. Adapt repository-specific assertions instead of deleting reusable validators. |
| Adapt | `package.json`, lockfile, TypeScript/ESLint/Fallow configuration, `.gitignore`, `.github/`, `harness.targets.json`, architecture and product docs | Merge the harness commands and dependencies into the existing project. Retain its package identity, stack, builds, CI settings, deployment targets, and applicable policies. Approve target coverage through the checklist. |
| Omit | This repository's `src/`, root `tests/*.test.ts`, `docs/task-cli.md`, `start` script, sample task data | These implement the demo CLI. Use the target project's code and tests. Keep the `test:product` command name if retaining the standard feedback composition; point it at the project's tests. |
| Omit and replace | This repository's `feature_list.json` contents and all sample `progress/` history/reports | Start a new queue or preserve the target's existing queue. Create fresh progress evidence through its normal workflow. Do not copy sample approvals as approval of the adoption. |
| Optional | Metrics: `record-gate.ts`, `record-agent-run.ts`, `summarize-metrics.ts`, `workflow-metrics*.ts`, `tests/metrics/` | Leave metrics out of default feedback and full gates. Remove unused metrics scripts and sample command expectations together if omitting this capability. |
| Optional | Impact analysis and local selection: `analyze-impact.ts`, `impact-analysis.ts`, `local-verification.ts`, related tests/guides | Enable only when affected-target selection helps. Keep `comparison-base.ts` and `git-changed-paths.ts` when other retained commands import them. The full gate remains mandatory. |
| Optional | Parallel worktrees, MCP integrations, platform templates | Adopt only the capabilities that fit the project. None is needed to execute the core gate. |

## Fresh queue compatibility

Empty the `HISTORICAL_DEFINITIONS` map in `scripts/legacy-bootstrap.ts` and the `HISTORICAL_REVIEWS` map in `scripts/final-review.ts` when the target does not carry this bootstrap history. Keep both modules and their normal validation paths. Never add replacement work to either exception map.

Remove the history-specific expectations from `tests/harness/legacy-evidence.test.ts`, `tests/harness/harness-state.test.ts`, and `tests/harness/canonical-review.test.ts`. Retain their normal evidence, canonical review, and reused-ID rejection tests. Adapt the assertions named "sample bootstrap" in `verification-loop.test.ts` when omitting optional capabilities. Keep the required-stage and project-failure contracts. See the [review-binding rules](review-binding.md) for exact report headings and both historical exceptions.

A fresh `feature_list.json` may initially contain `[]`; this is an empty queue, not completed adoption evidence. Track the adoption itself with a local or remote work-item reference, at most five acceptance criteria, and the normal implementation/review cycle. New completed work needs its own reports and history.

## First run

Use Node 24, pnpm 10.34.5, Git, and Bash for the checked-in command path. The reference versions come from `.github/workflows/verify.yml` and `package.json`; keep the runtime and package-manager choices aligned when adapting them. The harness TypeScript scripts need `tsx`; target discovery also needs `yaml`. Retain the development dependencies for the TypeScript, ESLint, and Fallow checks you keep.

Merge dependencies and scripts first. Run `pnpm install` once to reconcile an adopted manifest with its lockfile. Commit the resulting lockfile. Normal local and CI installs then use:

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm run audit:adoption
```

Initialize Git before running validators and commit a baseline before using comparison-based analysis. For an existing repository, fetch the intended target with enough history to compute a common ancestor. The default is `origin/main`; a feature branch's own upstream is not the comparison target. Set `HARNESS_BASE_REF=origin/develop` for a non-main target, or supply a valid commit. Invalid refs and missing common history fail clearly; fetch the missing history before retrying.

CI uses full checkout history, the PR target SHA for pull requests, and the pre-push SHA for pushes. GitHub's all-zero first-push SHA selects full analysis. A new repository without a predecessor can explicitly use `HARNESS_BASE_REF=0000000000000000000000000000000000000000` for full analysis. This checks existing findings rather than silently analyzing an empty diff. These inputs do not change the immutable review-content baseline.

## Project gate and delivery

Retain the standard feedback guards and adapt its product checks. Put all required project type checks, tests, and production builds in `verify:project`. The supported full composition is:

```json
{
  "verify": "pnpm run check:delivery && pnpm run feedback && pnpm run verify:project && pnpm run test:harness"
}
```

Use `pnpm run feedback` while implementing. Stage intended implementation, obtain independent approval bound to its digest, then run `./scripts/verify.sh` once as the final local gate. The working tree must match the reviewed index for tracked implementation. Finalize queue and progress evidence after it passes. CI runs `./scripts/verify.sh ci`; it rejects unfinished active work. Direct `pnpm run verify` keeps the local guard.

Prove that project failures reach the full gate. Use a controlled failing runtime or build configuration on the approved snapshot when available. During development, first run the failing project command directly. A delivery-phase or snapshot rejection alone does not prove that the project build executes. Restore the controlled input and record the failing project-stage output and successful final run. Do not fabricate approval for an intentional source failure.

## What the minimal fixture proves

`tests/harness/minimal-adoption.test.ts` creates a fresh Git index, copies the relevant core guards, clears both historical maps, and creates an empty queue and project-owned inventory. It copies no sample product or work-item history. Real delivery, state, release, binding, and target-inventory commands run. With no completed feature, binding correctly has no approval to validate.

The real project command reads project configuration, validates it against a runtime input, and writes an artifact. A small adopted contract reads that artifact. Local and CI entry points pass valid input, reject a deliberate project configuration failure before the later contract, and retain active-work and snapshot rejection.

The fixture reuses the installed dependency directory through a temporary symlink. It does not prove fresh dependency installation, production builds, TypeScript, ESLint, Fallow, or the full copied harness suite. Those expensive/project-specific checks are omitted from this fixture, not represented as passing stubs. Complete the checklist and run the target's actual commands before declaring adoption complete.
