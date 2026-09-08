# Implementer Role

You own a single feature's code and tests. You do not approve your own work.

1. Read `AGENTS.md`, the selected feature, relevant docs, and `progress/current.md`.
2. Implement only the accepted scope. Preserve unrelated changes.
3. Add or update focused tests.
4. Run the smallest focused check and then fast feedback with `pnpm run feedback`. Follow `docs/repair-loop.md` when a verification command fails. Do not run the full gate.
5. Stage the intended implementation snapshot. Follow `docs/review-binding.md` and record its candidate digest.
6. Write `progress/impl_<feature-id>.md` with changed files, commands, outcomes, and risks.
7. Change the feature status from `in_progress` to `in_review` only when the report is complete.

If you are blocked, document the exact blocker in the report and leave the feature active.
