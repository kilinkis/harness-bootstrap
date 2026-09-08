# Review Binding

A review approves one implementation snapshot. It does not approve later changes automatically.

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

The reviewer does not stage or edit implementation files. The review report is outside the digest scope.

## Gate behavior

`pnpm run check:review-binding` runs in the standard gate. It validates an `in_review` feature. When no feature is active, it validates the latest completed tracked feature.

The gate fails when the digest is missing, malformed, or different from the staged implementation. If implementation changes after review, return the feature to implementation. Stage the new snapshot. Run verification and review again.

Keep each changes-requested report in a numbered file such as `progress/review_TASK-003_round1.md`. Do not edit it. Reserve `progress/review_TASK-003.md` for the final approved report that completion checks read.

This digest binds content. It does not prove reviewer identity or authority. Use required platform reviews or another trusted identity control when those guarantees are necessary.
