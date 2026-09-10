# Review Binding

A review approves one implementation snapshot. It does not approve later changes automatically.

This protocol applies to the normal feature workflow. An automatically classified low-risk documentation change uses change-request review and full CI instead of local role reports and a digest.

The harness represents the staged implementation snapshot with a SHA-256 digest. The digest uses each staged file path, Git mode, and Git object ID. It excludes `feature_list.json` and all files in `progress/`. Those files must change when the leader records review and completion state.

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

The reviewer does not stage or edit implementation files. The review report is outside the digest scope. After approval and the final local full gate, the leader can finalize queue and progress evidence without changing the digest.

## Gate behavior

`pnpm run check:review-binding` runs in the standard gate. It validates an `in_review` feature and skips `in_progress` work. When no feature is active, it validates the latest completed tracked approval.

The gate fails when the active review digest is missing, malformed, or different from the staged implementation. If implementation changes after review, return the feature to implementation. Stage the new snapshot. Run verification and review again. The leader checks this binding in the full gate before evidence-only finalization.

When no feature is active, the latest completed review permits two narrow maintenance lanes: `docs/task-cli.md` documentation and dependency maintenance. Dependency maintenance can change only `pnpm-lock.yaml`, dependency or `packageManager` fields in `package.json`, and the pnpm setup version in `.github/workflows/verify.yml`. Scripts, source, arbitrary manifest fields, other workflow changes, and unknown implementation paths remain digest-bound. Queue and progress evidence retain the digest exclusions described above.

The maintenance baseline is the latest commit in `HEAD` history that changed the canonical review report. The gate requires that committed report to match the current report and its implementation digest to match the committed tree. It compares cumulative staged implementation changes against that commit, including staged manifest and workflow contents. Approved documentation and dependency changes can accumulate across maintenance merges. Advancing the default branch does not move the review baseline. An arbitrary clean tree with unrelated implementation changes still fails.

The maintenance exception fails with `REVIEW_BINDING_BASELINE_INVALID` when the committed baseline is unavailable or invalid. Fetch full Git history when the review commit is missing from a shallow checkout. Do not fabricate a new digest to bypass this finding. Keep the canonical report with its reviewed implementation in the delivered commit. A new normal feature approval establishes the next baseline.

The full harness gate and required remote review still apply to maintenance. This content check does not prove that remote review occurred. Untracked files and unstaged changes remain outside the staged digest.

Keep each changes-requested report in a numbered file such as `progress/review_TASK-003_round1.md`. Do not edit it. Reserve `progress/review_TASK-003.md` for the final approved report that completion checks read.

This digest binds content. It does not prove reviewer identity or authority. Use required platform reviews or another trusted identity control when those guarantees are necessary.
