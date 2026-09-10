# Review: TASK-028 — CI fixture isolation repair

## Verdict

Approved. No blocking findings remain for the corrected TASK-028 snapshot.

## Scope reviewed

Renewed approval covers the original TASK-028 implementation plus the narrow CI fixture repair. The original full review remains applicable and is preserved verbatim in [review_TASK-028_round1.md](review_TASK-028_round1.md). Its approved digest was `sha256:28e9d139472b72b0f33266a8219ed664524607215ef8564900e9df9364ac4768`.

The only staged implementation change is in `tests/harness/local-verification.test.ts`. The fixture copies the parent environment, removes `HARNESS_BASE_REF`, and passes that private copy to its selector subprocess. The default-selection fixture therefore uses its own `origin/main`, rather than a real-repository CI SHA absent from the temporary repository. The explicit `--base` test path remains intact. Production resolution and CI behavior are unchanged.

Inspected the staged diff, TASK-028 criteria, current plan, implementation repair evidence, prior approval, local-selector fixture, and separate comparison-base contracts. The latter still inject environment overrides and test explicit precedence, invalid refs, detached inputs, and first-push behavior. Clearing the environment in this default-case helper does not remove that coverage or mutate the parent's environment.

The original acceptance criteria remain satisfied. No new correctness, maintainability, security, architecture, or performance concern was found in the repair.

## Commands and results

- `HARNESS_BASE_REF=1111111111111111111111111111111111111111 HARNESS_DELIVERY_PHASE=ci node --import tsx --test tests/harness/comparison-base.test.ts tests/harness/local-verification.test.ts tests/harness/impact-analysis.test.ts tests/harness/verification-loop.test.ts`: passed all 22 focused contracts with required CLI IPC access. The previously failing default-selection test passed despite the inherited non-fixture SHA. Environment overrides, explicit precedence, invalid refs, first-push full analysis, real Fallow findings, and selectors also passed.
- `git diff --cached --stat` and the staged diff: confirmed only the environment-isolation change affects implementation. Other staged changes are queue and progress evidence.
- `git diff --name-only`: returned no tracked worktree differences from the index before report renewal.
- `git diff --cached --check`: passed.
- `pnpm run review:digest`: independently produced the corrected digest below.
- Confirmed `progress/review_TASK-028_round1.md` did not exist, then preserved the original canonical approval there with exclusive creation. A byte comparison verified exact preservation before the new canonical report was written.

The reviewer did not edit implementation files, stage files, run the full gate, commit, push, or merge. Existing `output/` and `tmp/` artifacts remain untouched.

Implementation digest: sha256:779e47f25de882fd29833c4b79df4dc0176285dca74742a81b4bbe0588dc9ea6

## Remaining risks

The original comparison-base limits remain: intended target history must be available, and first-push full analysis can reveal existing findings. The repair changes only test isolation.

The leader must run the final full gate with the real CI baseline, finalize evidence, and confirm required remote checks before merge. Publication and merge are now authorized; the leader owns those actions. Dependent feature snapshots require their own renewed digest bindings after receiving this repair.
