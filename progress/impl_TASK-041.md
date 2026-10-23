# TASK-041 Implementation

## Scope

Use the invoking agent for reasoning and persistent local commands for the inventory exercise. This revises the same unmerged PoC after the user selected operation without separate API credits. Work item: https://github.com/kilinkis/harness-bootstrap/issues/98. Draft PR: https://github.com/kilinkis/harness-bootstrap/pull/99. Branch: `codex/tanstack-harness-poc`.

The prior TanStack implementation and approval are recoverable at `f940abe`, with digest `sha256:ab7cf866bff141d402dbe07908fd96916221a464a276aa0d04102c09d31d95e3`. The latest previous delivery evidence is at `29f92f6`. This revision removes the direct model runtime. Zod remains for input and state validation.

Review tier: risky-review (scripts/** and package.json). The implementation remains below 300 added TypeScript implementation lines.

## Files changed

- `scripts/poc/agent-session.ts`: persistent session lifecycle, bounded inputs, atomic writes, exclusive session locks, validation, and digest-bound review.
- `scripts/poc/agent-cli.ts`: CLI arguments, bounded stdin, JSON output, and failure exits.
- `tests/harness/agent-poc.test.ts`: eight lifecycle, process persistence, invalid input, stale evidence, rejection, concurrency, cleanup, final validation, and CLI contracts.
- `docs/agent-poc.md`: copyable invoking-agent prompt, commands, and trust limits.
- `package.json`, `pnpm-lock.yaml`: replace the PoC command and remove four TanStack dependencies.
- Remove the previous three TanStack scripts, tests, and guide. The prior version remains in Git.
- Queue and progress files: revised criteria and evidence. Core validators are unchanged.

## Commands and results

- Startup `pnpm run feedback`: passed, including 7 product tests. Log: `/tmp/task-042-startup.log` (filename predates the decision to reuse TASK-041).
- `pnpm run check`: passed.
- `pnpm exec eslint scripts/poc tests/harness/agent-poc.test.ts --max-warnings=0`: passed after repair 1.
- `node --import tsx --test tests/harness/agent-poc.test.ts`: 8 passed, zero failures. Log: `/tmp/task-041-agent-tests.log`.
- `pnpm run feedback`: exit 0; all fast stages and 7 product tests passed. Log: `/tmp/task-041-agent-feedback.log`.
- `git diff --cached --check`: passed.
- `pnpm run review:digest`: computed the staged snapshot below.

## Invoking-agent demonstration

The implementer used the CLI to start session `58da2699-12b6-4a80-aca2-d563287b4d09`, write a valid inventory, check it, and hand it off. The independent reviewer read the task and inventory, ran its own check with zero findings, and submitted an approval through the CLI. The implementer then ran `finish`; it returned `passed: true`, phase `completed`, and zero final findings.

Inventory digest: `1f34632c5c8cc5310de277c7a780625a64a479932228dfee0e4d4d2c810d323c`. Output: `/tmp/task-041-agent-result.json`. The completed session remains in the ignored local store for inspection. These steps used no model API credentials or SDK calls. The agents used their existing invoking environment.

## Repair attempts

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Focused ESLint | `prefer-optional-chain` in reviewer check guard | Replace the explicit presence/disjunction guard with optional chaining | Passed; focused tests and fast feedback also passed |

## Remaining risks

The CLI enforces phases and matching content, not reviewer identity. Local filesystem access can alter evidence; independent agent assignment remains the caller's responsibility. A killed process can leave a lock for manual recovery. Inventory validation checks declarations, not whether commands work. This synthetic exercise does not approve real repository changes or replace its full gate. The invoking agent's normal account allowance and limits still apply. The prior audit found three existing brace-expansion advisories in the ESLint dependency chain; this revision does not repair that unrelated baseline.

## Review and delivery

Implementation digest: sha256:a16573e092d9656e72dbd09898ef3726635884d303453a26043c3a668d8ed600

Independent risky-review approved this digest in `progress/review_TASK-041.md`. The implementer ran `./scripts/verify.sh` once after approval: exit 0, all stages passed, 7 product tests and 115 harness tests passed. Log: `/tmp/task-041-agent-final-gate.log`. Evidence-only finalization marks the feature done locally. Draft PR #99 will carry this revision; no merge is requested.

Finalization checks: `HARNESS_DELIVERY_PHASE=ci node --import tsx scripts/check-delivery.ts` and `node --import tsx scripts/check-harness-state.ts` both passed after evidence-only finalization.
