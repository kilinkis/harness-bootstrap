# Implementation Report: TASK-028

## Scope

Resolve an explicit comparison baseline for Fallow, local verification selection, and impact analysis. A pushed feature branch no longer relies on its own upstream for analysis scope. CI supplies the pull-request target or pre-push SHA. The first push selects full analysis instead of an empty diff.

This implements assessment R5 and issue #61. The immutable review-content baseline from TASK-024 remains unchanged. Command-extension and working-tree/index work remain assigned to TASK-029 and TASK-030.

## Files changed

- `scripts/comparison-base.ts`: selects an explicit requested ref, then `HARNESS_BASE_REF`, then `origin/main`. Resolves the target's common ancestor with `HEAD`. Invalid or unavailable nonzero bases fail clearly; an all-zero first-push SHA selects full analysis.
- `scripts/analyze-changes.ts` and `package.json`: pass the resolved SHA explicitly to `fallow audit --base`. The first-push path uses `fallow --fail-on-issues`. The adapter preserves Fallow's exit status.
- `scripts/local-verification.ts` and `scripts/analyze-impact.ts`: use the shared resolver. The local selector forwards the resolved SHA to its selected command.
- `scripts/git-changed-paths.ts`: enumerates all tracked paths for full analysis and retains unignored untracked paths.
- `.github/workflows/verify.yml`: supplies the PR target SHA or pre-push SHA through `HARNESS_BASE_REF`.
- `tests/harness/comparison-base.test.ts`: exercises pushed branches, divergent targets, detached checkouts, explicit overrides, actual command propagation, invalid refs, and first-push full analysis. A real installed-Fallow fixture proves clean and failing full-analysis outcomes.
- `tests/harness/verification-loop.test.ts`: protects the CI baseline input expression.
- `docs/verification.md` and `docs/impact-analysis.md`: document precedence, common-ancestor semantics, non-main targets, first pushes, missing history, and the separate review-content anchor.
- `feature_list.json` and `progress/current.md`: record the handoff. Later items remain pending.

Added script and test lines total 224. The implementation remains below the 300-line target. No review-binding implementation or historical report changed.

## Commands and results

- `pnpm exec fallow --version`: confirmed installed Fallow 3.24.1.
- `pnpm exec fallow audit --help`: confirmed that implicit audit scope can use the branch upstream, and that explicit `--base` is supported.
- `pnpm exec fallow --help`: confirmed full-command support for `--fail-on-issues` and its nonzero finding status.
- `pnpm exec tsx --test tests/harness/comparison-base.test.ts`: established the regression before implementation. All 3 initial contracts failed because bare `fallow audit` received neither the intended baseline nor first-push full-analysis behavior.
- `pnpm exec tsx --test tests/harness/comparison-base.test.ts tests/harness/local-verification.test.ts tests/harness/impact-analysis.test.ts tests/harness/verification-loop.test.ts`: the final focused suite passed all 22 contracts. It executes the local selector's chosen command and checks the forwarded SHA. The Fallow adapter receives the expected common ancestor even when the feature upstream equals HEAD and the target branch advances independently.
- The installed-Fallow fixture passed clean full analysis and rejected a new unused source file. This verifies the first-push command and failure propagation rather than only checking a stub's arguments.
- `pnpm run feedback`: first failed on ESLint's explicit Error requirement for Promise rejection in the Git helper. Applied the narrow correction below.
- `pnpm exec eslint scripts/comparison-base.ts --max-warnings=0`: passed after the correction.
- `pnpm run feedback`: passed state, release, binding, target inventory, TypeScript, ESLint, explicit-base Fallow analysis, and all 7 product tests. The recorded base was `origin/main` at `db63e0c09b539bb48f4840c934fcdb71b946a35e`.
- `git diff --cached --check`: passed. Inspected the staged resolver, adapter, selector, CI, and command diffs.
- `pnpm run review:digest`: passed and produced the digest below.

Fallow reported one inherited duplication group between the existing local and impact option parsers. The unchanged new-only gate excluded that inherited finding and passed. No unrelated cleanup was made.

The implementer did not run the full repository gate, commit, push, or merge. The real Fallow full command ran only against temporary fixtures.

## Repair attempts

The initial focused command established the failure before implementation.

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Focused comparison, local-selector, impact, and command contracts | Bare audit omitted explicit target/CI baselines and first-push full mode. | Added the shared resolver, explicit Fallow adapter, selector propagation, and CI event inputs. | Focused contracts passed. Subsequent fast feedback found the Git helper's Promise rejection typing issue. |
| 2 | `pnpm exec eslint scripts/comparison-base.ts --max-warnings=0`, focused contracts, then `pnpm run feedback` | ESLint required an explicit Error as the Promise rejection reason. | Wrapped the Git execution error message in an Error. | Focused lint, all 22 contracts, and fast feedback passed. |

## Review binding

The intended implementation files were staged before handoff. Queue and progress evidence retain their documented digest exclusions. Existing `output/` and `tmp/` artifacts remain untracked and untouched.

Implementation digest: sha256:779e47f25de882fd29833c4b79df4dc0176285dca74742a81b4bbe0588dc9ea6

## Remaining risks

Normal change analysis requires a valid intended target and common Git history. Missing refs or shallow history must be repaired or replaced with an explicit valid target. The resolver does not silently guess another branch.

The first-push full path intentionally checks existing findings. An adopted repository may need to address those findings before its first successful CI run. Unrelated production readiness remains outside this harness change.

Publication remains blocked by the earlier automatic approval review decision recorded in `progress/current.md`. No publication retry was made.

## Leader verification

After independent approval, `./scripts/verify.sh` exited 0 on the approved snapshot. All fast checks, 7 product tests, and 89 harness contracts passed. Queue and progress evidence were finalized without changing implementation content.

After evidence finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery` and `pnpm run check:harness-state` passed.


## CI fixture isolation repair

Required [CI run 34528367163](https://github.com/kilinkis/harness-bootstrap/actions/runs/34528367163) failed the contract `the command defaults to origin/main`. CI provides `HARNESS_BASE_REF` for the real repository, but the temporary fixture has independent Git history. Its default-case child inherited a SHA that does not exist there.

Changed only `tests/harness/local-verification.test.ts`: copy the child environment and remove `HARNESS_BASE_REF` before running this fixture's selector. Explicit `--base` cases remain intact. The separate `comparison-base.test.ts` fixtures continue to inject and verify environment overrides, explicit precedence, invalid references, and first-push analysis. No production behavior changed. The repair adds 3 test lines.

- Reproduction: `HARNESS_BASE_REF=1111111111111111111111111111111111111111 pnpm exec tsx --test --test-name-pattern='the command defaults to origin/main' tests/harness/local-verification.test.ts` failed with `COMPARISON_BASE_INVALID` on the inherited SHA.
- Verification: `HARNESS_BASE_REF=1111111111111111111111111111111111111111 pnpm exec tsx --test tests/harness/comparison-base.test.ts tests/harness/local-verification.test.ts tests/harness/impact-analysis.test.ts tests/harness/verification-loop.test.ts` passed all 22 contracts after isolation.
- Startup and final `pnpm run feedback` passed all fast checks and 7 product tests. The inherited parser-duplication finding remained excluded by the unchanged new-only gate.
- `git diff --cached --check` passed. Inspected the staged fixture-only correction.
- `pnpm run review:digest` produced the revised implementation digest recorded above.

This is one repair attempt in the CI-discovered cycle after the previous focused, fast, and local full gates passed. The hypothesis was that the default fixture must own its environment. The single correction passed the original regression and all related focused checks.

The previous approved digest was `sha256:28e9d139472b72b0f33266a8219ed664524607215ef8564900e9df9364ac4768`. The previous canonical approval has not been edited by the implementer. Independent review must preserve that report as numbered history before writing a renewed canonical approval. The leader still needs to run the final gate with the real CI base environment and confirm remote checks. Later dependent snapshots need the same fixture correction and their own renewed bindings.

The user has now authorized publication and merging through pull requests. The earlier publication-blocked note above records the original implementation context. The implementer did not run a full gate, commit, push, or alter dependent branches during this repair. Untracked `output/` and `tmp/` artifacts remain untouched.

## Leader CI-repair verification

After renewed independent approval, `HARNESS_BASE_REF=db63e0c09b539bb48f4840c934fcdb71b946a35e ./scripts/verify.sh` exited 0. All fast checks, 7 product tests, and 89 harness contracts passed. This repeats the final gate because the CI-discovered fixture repair changed the approved implementation snapshot. Only evidence was finalized afterward.
