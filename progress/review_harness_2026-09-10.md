# Harness improvement review — 2026-09-10

## Scope reviewed

Review the existing harness as a reusable bootstrap. Identify defects and adoption costs. Do not implement features or expand the sample product.

Reviewed commit: `ca3793cab6ee` on `codex/TASK-023-dependency-maintenance-lane`.

Implementation digest: sha256:18b47ab9fc85ae6ee4b689d93e87a190c250521f1bc72c105c93a0382c5b7057

The digest records the inspected index. This report is an assessment, not an approval for a feature. All queue entries were completed or skipped. No feature was activated. Existing untracked `output/` and `tmp/` files were left untouched.

## Verdict

Fix the lifecycle and discovery defects before recommending this bootstrap for broad adoption. Preserve the small product, focused feedback, independent review, and explicit adoption boundary. A replacement framework is unnecessary.

The existing checks pass. Temporary Git and filesystem fixtures exposed missing lifecycle cases. Test success therefore does not establish all of the documented workflow guarantees.

## Findings

P1 means fix before wider adoption. P2 means address next to improve reliability or adoption cost. Effort is estimated engineering time, including focused regression tests and documentation. Estimates are not measured agent runtimes and should not be summed as an exact schedule.

| ID | Priority | What is wrong | Recommended fix | Effort |
| --- | --- | --- | --- | --- |
| R1 | P1 | Maintenance changes can pass before merge and break the clean default branch afterward. The maintenance exception depends on a diff against the moving `origin/main` ref. | Make approval validation independent of a moving maintenance diff. Validate the current change against a stable base and record how approved maintenance advances the baseline. Test the complete merge lifecycle. | 1–2 days |
| R2 | P1 | A valid comment in `pnpm-workspace.yaml` can silently hide packages from discovery and the adoption audit. | Parse YAML correctly and validate the supported workspace shape. At minimum, skip comments correctly and report unsupported syntax instead of silently truncating discovery. | 0.5–1 day |
| R3 | P1 | An old numbered approval can satisfy completion even when the canonical final review requests changes. Verdict and digest come from different evidence. | Require the verdict, required sections, and matching digest in the same canonical final report. Keep numbered rounds as history. | 2–4 hours |
| R4 | P1 | The merge workflow has no stricter completion check than development feedback. `in_progress` implementation changes can pass the state and binding validators without review reports. | Keep development feedback permissive. Add a completion check requiring approved review, and require finalized feature state at the CI merge boundary. | 0.5–1 day |
| R5 | P2 | Fallow can compare a pushed feature branch with its own upstream branch, omitting the committed feature changes from local analysis. | Resolve one explicit comparison base and pass it to Fallow and the harness classifiers. Select the PR base or pre-push commit as appropriate in CI. | 0.5–1 day |
| R6 | P2 | The documented `verify:project` extension fails two command-composition tests. The tests enforce the exact sample command. | Permit project verification between the required harness stages. Test execution order and failure propagation with stub commands. Retain sample-specific assertions separately where useful. | 0.5–1 day |
| R7 | P2 | Approval hashes the index, but local verification executes the working tree. Unstaged implementation edits can pass binding against an older staged snapshot. | At final verification, reject implementation differences between the index and working tree, or verify an isolated staged snapshot. Keep normal development feedback usable with unstaged changes. | 0.5–1 day |
| R8 | P2 | Missing `issue` fields grant the legacy exemption to new completed features too. In a fresh adopted queue, this can eliminate report and digest requirements. | Restrict grandfathering to explicit existing legacy entries. Require a non-empty local or remote work-item reference for new completed work. | 2–4 hours |
| R9 | P2, design improvement | The bootstrap has no concise adoption map that distinguishes required files, files to adapt, sample history, and optional capabilities. Adopters must infer that boundary across many documents and tests. | Add one small adoption map and a tested minimal adoption example. Keep metrics and impact analysis optional. Include runtime, dependency installation, and Git-base prerequisites in the first-run instructions. | 0.5–1 day |

### R1 — Maintenance fails after the default branch advances

Source: [review-binding.ts](../scripts/review-binding.ts), lines 98–113; [dependency-maintenance.ts](../scripts/dependency-maintenance.ts), lines 18–33.

The digest covers the entire staged implementation tree. A maintenance update changes that tree without creating a new feature approval. Before merge, its changed paths qualify for an exception. After `origin/main` advances to the update, the change set is empty. Neither maintenance classifier accepts an empty change set. The validator then compares the new tree with the older feature digest and emits `REVIEW_BINDING_STALE`.

Reproduced separately for `pnpm-lock.yaml` and `docs/task-cli.md`. Both passed before updating the remote-tracking ref. Both failed afterward. This affects clean post-merge verification and the next task's required startup feedback.

Do not fix this by accepting every clean working tree. That would also accept unreviewed committed code. Preserve a stable, auditable relation between the approval and the implementation, including maintenance transitions.

### R2 — Workspace discovery silently stops at comments

Source: [adoption-target-discovery.ts](../scripts/adoption-target-discovery.ts), lines 122–153.

The parser stops at any non-indented nonempty line. This includes a top-level comment inside the packages sequence:

```yaml
packages:
  - apps/*
# Shared packages
  - packages/*
```

With `apps/web/package.json` and `packages/shared/package.json` present, discovery returned only `.` and `apps/web`, with no finding. An inventory declaring just those two targets also produced an adoption audit with no findings. The missing shared package can therefore escape verification planning.

The bootstrap can retain a limited workspace support contract. It must report unsupported syntax reliably. It does not need to implement every package manager.

### R3 — Approval and digest can come from different reports

Source: [harness-evidence.ts](../scripts/harness-evidence.ts), lines 87–114; [review-binding.ts](../scripts/review-binding.ts), lines 52–86.

Evidence validation combines all review rounds and accepts any report with an approved verdict. Binding independently reads only `progress/review_<id>.md` and checks its digest, without checking its verdict.

A completed feature with an approved `review_TASK-100_round1.md` and a canonical `review_TASK-100.md` containing `Verdict: changes requested` and the current digest passed both validators. The final report must be the single source of the approval decision.

### R4 — Development validation also serves as merge validation

Source: [review-binding.ts](../scripts/review-binding.ts), lines 103–106; [harness-evidence.ts](../scripts/harness-evidence.ts), lines 57–61; [verify.sh](../scripts/verify.sh); [verify.yml](../.github/workflows/verify.yml).

An `in_progress` feature with its ID in `progress/current.md` needs neither an implementation report nor a review report. Review binding deliberately skips it. Those are reasonable development semantics. The full gate and CI reuse them without a separate completion requirement.

The isolated probe staged an implementation change, removed both reports, and left the feature `in_progress`. Both validators returned no findings. Code inspection shows no subsequent feature-completion assertion in the gate composition. The repository's GitHub setup also permits zero required platform approvals for solo use, so that configuration does not supply the missing check.

A completion mode should accept approved `in_review` state for the leader's final local gate. CI should enforce the finalized state described by the delivery workflow. This is an accidental-omission safeguard, not a claim that repository code can prove reviewer identity.

### R5 — Changed-code analysis uses inconsistent bases

Source: [package.json](../package.json), line 17; [local-verification.ts](../scripts/local-verification.ts), lines 93–97; [check-review-binding.ts](../scripts/check-review-binding.ts), lines 5–6.

The package command is bare `fallow audit`. Installed Fallow help states that it first uses the branch upstream unless an explicit base is supplied. The harness selector forwards `HARNESS_BASE_REF`, but Fallow uses its own `FALLOW_AUDIT_BASE` setting.

On the inspected branch, normal feedback reported 10 changed files against the feature branch's upstream at HEAD. An explicit `--base origin/main` reported 20 changed files. Git confirmed 10 committed changed paths between the default branch and HEAD. The explicit audit still passed; this finding concerns missing coverage in the default local command, not an observed quality defect in those files.

Test a pushed feature branch, a detached PR checkout, a default-branch push, and an adopter whose default branch is not `main`.

### R6 — Sample assertions reject the documented adoption path

Source: [verification-loop.test.ts](../tests/harness/verification-loop.test.ts), lines 27–30 and 69; [ADOPTION_CHECKLIST.md](../ADOPTION_CHECKLIST.md), project verification section.

The checklist instructs adopters to compose `verify:project` into `verify`. In an isolated copy, changing the command to the documented form caused two of four verification-loop tests to fail:

```text
pnpm run feedback && pnpm run verify:project && pnpm run test:harness
```

The tests expected exactly `pnpm run feedback && pnpm run test:harness`. A reusable contract should preserve the required checks and failure behavior while allowing the product gate. Documentation-presence tests can remain small, but exact prose and sample-command assertions should not dominate adoption contracts.

### R7 — Local verification and approval can inspect different bytes

Source: [review-binding.ts](../scripts/review-binding.ts), lines 30–39 and 145–156; [package.json](../package.json), lines 14–30.

The probe changed a tracked source file after an approved index snapshot without staging it. State and binding both passed. Type checking and tests execute the changed working tree, while the digest still represents the old index. This can create misleading local verification evidence.

Restrict any cleanliness requirement to intended implementation files at final verification. Preserve unrelated user artifacts. CI checks out committed content, so this finding primarily concerns the local approval handoff.

### R8 — Legacy exemption is inferred from a missing field

Source: [check-harness-state.ts](../scripts/check-harness-state.ts), lines 202–212; [harness-evidence.ts](../scripts/harness-evidence.ts), lines 57–61; [review-binding.ts](../scripts/review-binding.ts), lines 107–110.

The documentation describes missing issue references as a legacy bootstrap exception. The validator has no cutoff or explicit legacy allowlist. A fresh queue with a new `done` feature without an `issue` field, no progress reports, and changed staged source passed both validators.

Preserve genuine historical entries without requiring fabricated evidence. Do not let new entries inherit that exemption by omission. Local work-item identifiers already fit the current string interface.

### R9 — Make the minimum adoption path explicit

Sources: [README.md](../README.md), [ADOPTION_CHECKLIST.md](../ADOPTION_CHECKLIST.md), [docs/upgrading.md](../docs/upgrading.md), and the tracked repository inventory.

The inspected tree contains 27 script files, 17 documents, and 62 progress files. These are reasonable source-project assets, but they are not all appropriate starter context. README says to adapt only relevant structure, while the checklist begins after copying the scripts. Neither provides a concise dependency map for that selection.

Add a table with four actions: copy, adapt, omit, and optional. Identify the script/test dependencies of the selected core. Show how to replace the source queue and history, choose the default Git base, install the declared tools, and run the first gate. The current quick start begins with verification before mentioning dependency installation.

Keep this as documentation and one minimal adoption fixture initially. Do not add a generator, plugin platform, new orchestration service, or broad product-readiness gates to solve this problem.

## Files inspected

- Agent guide, role definitions, feature queue, checkpoints, architecture, conventions, repair loop, and review binding protocol.
- Package scripts, TypeScript and ESLint configuration, Fallow configuration and installed CLI help, CI workflow, and PR template.
- State validation, review evidence, Git path selection, maintenance classifiers, target discovery, target inventory validation, and impact analysis.
- Adoption, verification, GitHub setup, release, and upgrade guidance.
- Harness contract tests, with emphasis on state, binding, command composition, and adoption fixtures.

## Commands and results

| Command or experiment | Result |
| --- | --- |
| `pnpm run feedback` | Passed after an environment-only retry outside the sandbox. State, release, binding, inventory, TypeScript, ESLint, Fallow, and 7 product tests passed. |
| `pnpm run test:harness` | Passed: 68 tests, 0 failures. |
| `pnpm exec fallow audit --help` | Confirmed installed base-selection behavior and supported explicit base options. |
| `pnpm exec fallow audit --base origin/main --summary` | Passed after allowing Fallow to create its temporary Git worktree. Reported 20 changed files. |
| `git diff --name-only origin/main HEAD` | Reported 10 committed changed paths. |
| Temporary Git probes through the exported validators | Confirmed R1, R3, R4, R7, and R8. Each temporary repository was removed afterward. |
| Temporary workspace discovery and audit probes | Confirmed R2, including an audit with no findings despite an omitted package. |
| Isolated verification-loop tests with documented project extension | Failed as expected: 2 passed and 2 failed. Both failures rejected the added project gate. |
| `computeImplementationDigest(process.cwd())` through Node and the local tsx loader | Recorded the digest above. |

The initial feedback attempt failed because sandbox restrictions prevented the tsx IPC socket. The first explicit-base Fallow attempt could not create a temporary Git worktree under the sandbox. Both succeeded with the required environment access. Neither was treated as a repository defect. No repair edits were made.

The adversarial validator probe was run with `node --import /Users/jminc/code/harness-bootstrap/node_modules/tsx/dist/loader.mjs /tmp/harness-review-probes.mjs`. It imported the repository's exported functions and changed only temporary fixtures. The documented-extension experiment copied the necessary contract inputs into a temporary directory, changed only that copy's package command, and executed its verification-loop test through the same Node loader.

## Remaining risks

- This is a repository assessment, not an exhaustive security audit or approval of every source file.
- Remote GitHub rules and live CI results were not inspected. Conclusions about configured enforcement use the checked-in workflow and setup guidance.
- Optional workflow-metrics tests were not run. They are outside the default harness gate.
- Actual production-build coverage remains an adopter responsibility, as the existing documents correctly state.
- Findings remain unimplemented. This assessment adds only this report and does not change the queue, implementation, approvals, or Git history.
