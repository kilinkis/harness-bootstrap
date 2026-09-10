# Bounded Repair Loop

Use this loop after a deterministic verification command fails. Its purpose is to produce evidence and a narrow correction. Its purpose is not to keep an agent busy until a command happens to pass.

## Default budget

Allow at most three repair attempts in one repair cycle. A failed focused, fast, or full gate starts the cycle.

The first failed verification run establishes the failure. It does not consume a repair attempt. Each code or configuration change made to correct that failure consumes one attempt.

A newly exposed error uses the remaining cycle budget. A changed command, error, or failed assertion does not reset the count. A new cycle starts only after the repaired gate passes and later work causes another failure.

## One attempt

1. Observe the smallest reproducible failure.
2. Diagnose its cause from current evidence.
3. State the hypothesis that the next change will test.
4. Make the smallest change that tests the hypothesis.
5. Run the focused failing command again.
6. Record the attempt and its result.

Do not rerun an unchanged deterministic command without a reason. A retry is acceptable for a documented transient dependency, network, or service failure. Record the evidence for that classification.

Do not make another code change without new evidence or a changed hypothesis. Repeated speculative edits consume the budget and hide the original cause.

## Stop immediately

Stop before another attempt when:

- The next action needs authority that the user did not give.
- A required secret, credential, account, or external service is unavailable.
- The next action is destructive and is not clearly authorized.
- The acceptance criteria are ambiguous enough to change the intended result.
- Evidence shows that the failure is outside the accepted scope.

Keep the feature `in_progress`. Record the exact blocker in `progress/current.md` and the implementation report. Ask for the smallest decision or input that can resume work.

## Exhausted budget

Stop after three unsuccessful repair attempts in one cycle. Do not mark the feature `in_review` or `done`. Keep it active and report it as blocked.

The blocked report must include:

- The failing command and primary error.
- The evidence collected in each attempt.
- The hypotheses and changes tested.
- The current best explanation.
- The input, authority, or external change needed next.

## Implementation report format

Add this section only when a verification failure caused a repair attempt:

```markdown
## Repair attempts

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | `pnpm test` | `example.test.ts` failed at assertion X | Cause Y; changed Z | Failed with error A |
| 2 | `pnpm test` | Error A isolated to module B | Cause C; changed D | Passed |
```

After a focused command passes, the implementer runs the normal fast gate. The implementer runs the one final local full gate only after independent approval. A focused pass does not complete the feature.

Repository checks can confirm that this guide and its entry points exist. They cannot detect an attempt that an agent did not record. Reviewers must compare the report with available command output and repository history.
