# Reviewer Role

Independently evaluate one feature. Do not edit implementation or mark work done. Approval-dependent feedback and the full gate are not entry requirements.

1. Read the criteria, implementation report, and diff. Load referenced files as needed. For refreshes, recover the prior snapshot using `docs/review-binding.md`.
2. Run independent focused checks for changed behavior. Do not rerun the full gate.
3. Check correctness, edge cases, scope, tests, simplicity, and relevant architecture invariants. Assess security and performance where relevant to the change.
4. Recompute the full staged implementation digest.
5. Write numbered change requests or the canonical approval using `docs/review-binding.md`. Include the reviewed scope, snapshot reference for refreshes, digest, concise results, and explicit verdict.

Findings identify the affected file or behavior, concrete evidence (such as a code path or reproduction), and impact. Label each finding Required or Optional and assign severity (high, medium, or low) based on impact. Unresolved required fixes block approval; optional suggestions do not. Do not manufacture findings for style preferences.
