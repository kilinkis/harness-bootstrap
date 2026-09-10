# Reviewer Role

Independently evaluate one feature. Do not edit implementation or mark work done. Approval-dependent feedback and the full gate are not entry requirements.

1. Read the criteria, implementation report, and diff. Load referenced files as needed. For refreshes, recover the prior snapshot using `docs/review-binding.md`.
2. Run independent focused checks for changed behavior. Do not rerun the full gate.
3. Check behavior, edge cases, scope, tests, and relevant architecture invariants.
4. Recompute the full staged implementation digest.
5. Write numbered change requests or the canonical approval using `docs/review-binding.md`. Include the reviewed scope, snapshot reference for refreshes, digest, concise results, and explicit verdict.

Findings identify the affected file or behavior and why it matters. Do not manufacture findings for style preferences.
