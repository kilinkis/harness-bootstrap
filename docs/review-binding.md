# Review Binding

A review approves one implementation snapshot. It does not approve later changes automatically.

This protocol applies to the normal feature workflow. An automatically classified low-risk documentation change uses change-request review and full CI instead of local role reports and a digest.

The harness represents the staged implementation snapshot with a SHA-256 digest. The digest uses each staged file path, Git mode, and Git object ID. It excludes `feature_list.json` and all files in `progress/`. Those files must change when the implementer records review and completion state.

## Implementer handoff

1. Finish the implementation and focused verification.
2. Stage every intended implementation file.
3. Do not stage unrelated user files.
4. Inspect `git diff --cached`.
5. Run `pnpm run review:digest`.
6. Put the candidate digest in the implementation report.
7. Move the feature to `in_review`.

The digest reads the Git index. It does not include untracked files. A new implementation file must be staged before review.

## Reviewer approval

1. Inspect the staged diff and the acceptance criteria.
2. Run the required verification.
3. Run `pnpm run review:digest` independently.
4. Put this exact line in the review report:

```text
Implementation digest: sha256:<64 lowercase hexadecimal characters>
```

5. State the verdict.

Use `progress/review_<feature-id>.md` for the final approval. Include the feature ID, the digest line, and these exact headings:

- `## Verdict`, followed by `Approved.` for approval or `Changes requested.` for rejection.
- `## Scope reviewed`, with the inspected scope and findings.
- `## Commands and results`, with independent verification evidence.
- `## Remaining risks`, with unresolved risks or an explicit statement that none remain.

The final report must contain its own verdict and evidence. Completion and binding read the same final report. Neither check combines numbered rounds or lets an earlier approval override a rejected, incomplete, or missing final report. Binding requires a valid approved report for both `in_review` work and the latest completed feature.

The reviewer does not stage or edit implementation files. The review report is outside the digest scope. After approval and the final local full gate, the implementer can finalize queue and progress evidence without changing the digest.

## Approval refresh

Return changed implementation to `in_progress` and stage the intended snapshot. Keep one canonical approval. The reviewer records the prior review commit and recoverable approved implementation commit or snapshot, verifies its digest, and reviews the delta and interactions. A report or digest alone cannot recover source; without that source, review the full current change.

Run relevant independent focused checks and recompute the full index digest. Replace the canonical approval with a self-contained verdict, prior snapshot reference, scope, results, risks, and new digest. Committed prior approvals remain in Git without duplicate archives. Preserve an uncommitted prior approval verbatim in a numbered report first. Historical and numbered reports remain immutable.

Run the final full gate on the newly approved implementation. Evidence-only finalization needs no new review. Required remote checks, whole-index binding, and delivery guards remain unchanged.

## Gate behavior

`pnpm run check:review-binding` runs in the standard gate. It validates an `in_review` feature and skips `in_progress` work. When no feature is active, it validates the latest completed tracked approval.

The gate fails when the active review digest is missing, malformed, or different from the staged implementation. If implementation changes after review, use the [approval refresh procedure](#approval-refresh). The implementer checks this binding in the full gate before evidence-only finalization.

When no feature is active, the latest completed review permits two narrow maintenance lanes: `docs/task-cli.md` documentation and dependency maintenance. Dependency maintenance can change only `pnpm-lock.yaml`, dependency or `packageManager` fields in `package.json`, and the pnpm setup version in `.github/workflows/verify.yml`. Scripts, source, arbitrary manifest fields, other workflow changes, and unknown implementation paths remain digest-bound. Queue and progress evidence retain the digest exclusions described above.

The maintenance baseline is the latest commit in `HEAD` history that changed the canonical review report. The gate requires that committed report to match the current report and its implementation digest to match the committed tree. It compares cumulative staged implementation changes against that commit, including staged manifest and workflow contents. Approved documentation and dependency changes can accumulate across maintenance merges. Advancing the default branch does not move the review baseline. An arbitrary clean tree with unrelated implementation changes still fails.

The maintenance exception fails with `REVIEW_BINDING_BASELINE_INVALID` when the committed baseline is unavailable or invalid. Fetch full Git history when the review commit is missing from a shallow checkout. Do not fabricate a new digest to bypass this finding. Keep the canonical report with its reviewed implementation in the delivered commit. A new normal feature approval establishes the next baseline.

The full harness gate and required remote review still apply to maintenance. This content check does not prove that remote review occurred. Untracked files and unstaged changes remain outside the staged digest. Final delivery additionally checks that tracked implementation files in the working tree match the index. It rejects unstaged content, deletion, and executable-mode differences before downstream verification. It uses the same `feature_list.json` and `progress/` exclusions as the digest. It does not stage files or remove untracked artifacts.

Keep each changes-requested report in a numbered file such as `progress/review_TASK-003_round1.md`. Do not edit it. Reserve `progress/review_TASK-003.md` for the final approved report that completion checks read.

Final verification assumes a normal full checkout without tracked changes hidden by `assume-unchanged` or `skip-worktree` index flags. The snapshot check uses ordinary Git index-to-working-tree comparison. It does not create an isolated checkout or prevent concurrent edits during verification.

Ordinary `pnpm run feedback` permits unstaged development. Before the final gate, reconcile each reported path with the intended snapshot. If implementation changes are needed, stage them and obtain a new matching review. Do not stage unrelated files to clear the check.

This digest binds content. It does not prove reviewer identity or authority. Use required platform reviews or another trusted identity control when those guarantees are necessary.

## Historical final reports

Four completed bootstrap features recorded their actual final approvals under older filenames. The shared resolver in `scripts/final-review.ts` designates these existing reports:

| Feature | Historical final report |
| --- | --- |
| TASK-005 | `progress/review_TASK-005_followup.md` |
| TASK-009 | `progress/review_TASK-009_followup.md` |
| TASK-011 | `progress/review_TASK-011_followup.md` |
| TASK-022 | `progress/review_TASK-022_round1.md` |

Each designation requires SHA-256 matches for both the original canonical report and the designated final report. Missing or changed history removes the designation. The normal canonical-report rules then apply. The selected historical report must independently contain the required approval and evidence. These exceptions do not combine reports or apply to new work with reused IDs.

Preserve the historical reports. Do not change their recorded hashes to bypass a failure. When adopting a fresh queue without this bootstrap history, remove the four historical mappings and their history-specific contract from `tests/harness/canonical-review.test.ts`.

## Historical bootstrap evidence

Only the original completed definitions of TASK-001, TASK-002, and TASK-004 are exempt from retrospective implementation reports, final reviews, history entries, and binding. `scripts/legacy-bootstrap.ts` pins each complete queue definition with SHA-256. Object key order does not affect identity. Changed titles, criteria, status, or other fields remove the exception. Reusing one of these IDs does not exempt replacement work.

All other completed features need a nonempty `issue` field that identifies a local or remote work item. A local identifier such as `local-TASK-100` is valid; a GitHub URL is not required. These features also need the normal implementation report, approved final review, history entry, and implementation binding. Missing or empty references fail validation and cannot disable standalone review binding.

Preserve the three historical queue definitions and existing history. Do not fabricate old reports or update the pinned hashes to exempt new work. When adopting a fresh queue without this bootstrap history, replace the historical-definition map with an empty map. Remove the history-specific fixture expectations from `tests/harness/legacy-evidence.test.ts` and `tests/harness/harness-state.test.ts`. Keep the new-work, reference, and evidence rejection contracts.
