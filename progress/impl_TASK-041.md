# TASK-041 Implementation

## Scope

Prototype TanStack sessions for an inventory repair exercise. Work item: https://github.com/kilinkis/harness-bootstrap/issues/98. Branch: `codex/tanstack-harness-poc`, based on `origin/main` at `3c39f03`.

The implementer edits only a temporary inventory. The reviewer has fresh conversation state and no write tool. Both use the existing inventory validator. Host code requires successful checks and one matching approved review before reporting success. The default adapter is scripted; the optional live adapter uses Anthropic, as requested.

Review tier: risky-review (triggers: scripts/** and package.json).

## Files changed

- `scripts/poc/tanstack.ts`: fixture lifecycle, role tools, sessions, and final checks.
- `scripts/poc/tanstack-demo.ts`: scripted adapters for the real runtime.
- `scripts/poc/tanstack-cli.ts`: offline default and explicit Anthropic mode.
- `tests/harness/tanstack-poc.test.ts`: runtime and failure contracts.
- `package.json`, `pnpm-lock.yaml`: pinned dependencies and opt-in command.
- `docs/tanstack-poc.md`: use, sources, evidence boundaries, and limitations.
- Queue and progress files: work-item state and evidence.

Implementation: 198 TypeScript lines across the three PoC files. Tests are 105 lines. No core validator changes.

## Commands and results

- Startup `pnpm run feedback`: passed on the branch baseline; 7 product tests. The first sandboxed attempt stopped at tsx IPC with EPERM. The unchanged command passed outside the sandbox.
- Installed exact versions: TanStack harness 0.1.0; core, persistence, and Anthropic 1.0.0; Zod 4.6.7.
- Loaded the core skill with `pnpm dlx @tanstack/intent@latest load @tanstack/ai#ai-core`. The optional configuration installer was canceled without edits. Verified APIs against published source because the skill metadata still names 0.42.0.
- `pnpm run check`: passed.
- Initial focused run: 5 tests passed. Added CLI configuration contracts afterward; final focused result follows below.
- `pnpm exec eslint scripts/poc tests/harness/tanstack-poc.test.ts --max-warnings=0`: passed after the repair below.
- `node --import tsx scripts/poc/tanstack-cli.ts`: passed. Scripted mode, six tool requests, two initial findings, zero final findings, matched review digest. Raw result: `/tmp/task-041-demo.json`.
- `pnpm run feedback`: passed; all fast stages and 7 product tests. Raw log: `/tmp/task-041-feedback.log`.
- `git diff --cached --check`: passed.
- `pnpm audit --audit-level high`: exit 1. Two high and one moderate advisory all affect existing `eslint > minimatch > brace-expansion@5.0.9`. The same version is present in `origin/main`; no new dependency advisory was reported. Full evidence: `/tmp/task-041-audit.json`. This pre-existing dependency maintenance is outside the PoC scope.
- No live inference: `ANTHROPIC_API_KEY` is absent. No credentials were read from files or printed.

## Repair attempts

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Focused ESLint | `no-unsafe-return` in tool-name inspection | TanStack exposes a broad tool name type; normalize it with `String` in the test assertion | Passed |

## Remaining risks

The existing ESLint dependency chain has three brace-expansion advisories, including two high-severity denial-of-service findings. No dependency repair was attempted in this PoC. The runtime is experimental and dependencies are pinned. Scripted success proves orchestration, not model quality. Anthropic inference is unverified without a key. The validator checks inventory structure and coverage, not whether declared commands work. Memory persistence does not survive restart. This bounded data-editing exercise is not a general coding sandbox or ticket runner. The PoC digest does not replace the repository staged implementation digest. See `docs/tanstack-poc.md`.

## Review and delivery

Implementation digest: sha256:ab7cf866bff141d402dbe07908fd96916221a464a276aa0d04102c09d31d95e3

Final focused command `node --import tsx --test tests/harness/tanstack-poc.test.ts`: 6 tests passed. Raw log: `/tmp/task-041-focused.log`. TypeScript and focused ESLint also passed after the CLI contract was added.

Independent risky-review approved this digest in `progress/review_TASK-041.md`. The implementer then ran `./scripts/verify.sh` once on the approved snapshot: exit 0, all gate stages passed, 7 product tests and 113 harness tests passed. Raw log: `/tmp/task-041-final-gate.log`.

Evidence-only finalization marks the feature done locally. `HARNESS_DELIVERY_PHASE=ci node --import tsx scripts/check-delivery.ts` and `node --import tsx scripts/check-harness-state.ts` both passed. Implementation commit: `f940abe`.

The user explicitly authorized publication with the existing `kilinkis` account after the initial account mismatch. The feature branch was pushed and draft PR https://github.com/kilinkis/harness-bootstrap/pull/99 was created. The account was selected only for those processes; the global default was not changed. Issue #98 remains open until merge. Required remote checks are tracked on the PR. No merge is requested.
