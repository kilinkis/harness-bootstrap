# Trivial-change lane

Use this lane for a change too small to need a work item, such as a typo, a copy fix, or a one-line bug fix. One agent makes the change and opens a pull or merge request. The request review replaces the local reviewer. Full CI remains required before merge.

## Eligibility

Stage the change and run `pnpm run check:trivial-change`. It compares the staged change with the actual PR target, `origin/main` by default. Set `HARNESS_BASE_REF` only to the actual target.

The automatic limits are:

- At most 3 files and 30 added plus deleted lines.
- No path that defines work items, evidence, the gate, or configuration: `feature_list.json`, `progress/**`, `tests/harness/**`, `scripts/**`, any dotfile or dot directory (hooks, CI, `.npmrc`), root JSON and YAML files (lockfile, Renovate, workspace, `harness.*.json`), `package.json` and TypeScript configuration files, and `*.config.*` files.
- No path in `riskyReview.paths` of `harness.models.json`; a pattern without a wildcard also covers everything under it. Add a project's sensitive areas there to keep them out of this lane. Without that policy, the lane is unavailable.
- No binary files, symlinks, submodules, or mode-only changes.

Use the normal lane, or the [small-code lane](small-code-changes.md), when the command refuses the change or when the change touches security, data formats, payments, or other risky-review conditions that file paths cannot show.

## Workflow

1. Create a branch. Do not add a queue entry or progress files.
2. Make the change and run the focused checks that cover it.
3. Stage it and run `pnpm run check:trivial-change`.
4. Open the request. Put all evidence in its body: `Lane: trivial`, the eligibility output, and the commands you ran with their results.
5. Merge after request review and required CI pass.

## How the gate enforces it

`check:review-binding` accepts changes after the last approved feature only when each default-branch step needs no work item: low-risk documentation, dependency maintenance, or a trivial change. Local commits after the comparison base and the staged index form one step, as CI sees the request, so the limits apply to the whole request. A step that needs a work item but has none fails as `REVIEW_BINDING_STALE`, also after later merges.
