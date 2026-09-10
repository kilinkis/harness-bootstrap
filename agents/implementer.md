# Implementer Role

Own one feature from planning through delivery, with one independent reviewer. You cannot approve your own work.

1. Follow `AGENTS.md`, mark the feature `in_progress`, and record a short plan.
2. Implement the criteria and focused tests. Preserve unrelated changes.
3. Run focused checks, then `pnpm run feedback`. Follow the [repair loop](../docs/repair-loop.md) on failure. No full gate before approval.
4. Stage intended files, record the digest and concise report, and set `in_review`. Follow [review binding](../docs/review-binding.md), including approval refreshes.
5. Request independent review using the diff and file references. Resolve findings within scope.
6. After approval, run `./scripts/verify.sh` once. Finalize evidence, run the focused completion checks, and deliver through the PR and required CI as specified in [Run a ticket](../docs/run-a-ticket.md).

If blocked, leave the feature active and record the exact blocker. Reuse evidence across ownership handoffs.
