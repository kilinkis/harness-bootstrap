# Upgrade an Adopted Harness

`HARNESS_VERSION` records the source release that an adopted harness has fully integrated. It does not state that the files are identical to the source repository.

## Upgrade procedure

1. Read `HARNESS_VERSION` in the adopted repository. Treat a missing file as an unknown legacy baseline.
2. Select a target release from the source repository's tags.
3. Read each applicable entry in `HARNESS_CHANGELOG.md`. Follow its adoption actions.
4. Compare the source tags in a temporary checkout. Do not add the source repository as a permanent remote unless you want its tags in the product repository.
5. Create a work item and feature branch in the adopted repository.
6. Adapt the changed contracts, scripts, and guidance to the product. Do not replace project-specific files without review.
7. Run `pnpm run audit:adoption`. Resolve target and production-build findings.
8. Run the repository's focused checks, fast feedback, and full gate.
9. Write the target release to `HARNESS_VERSION` only after the adapted gate passes.
10. Open a pull request. State the old release, target release, adapted changes, omitted changes, and verification evidence.

Do not copy the source `feature_list.json`, `progress/`, demo product, target inventory, or package commands into an established repository. Those files contain local state or product decisions. Merge the new behavior into their existing equivalents.

When the baseline is unknown, compare the complete target tag with the adopted harness. Record which capabilities already exist. Add missing capabilities in small work items. Set `HARNESS_VERSION` only after the complete target release has been assessed.

## Compare two source releases

Use a temporary clone of the source repository. Fetch both tags. Review the name-status summary before the full diff:

```bash
git diff --name-status v0.1.0..v0.2.0
git diff v0.1.0..v0.2.0
```

The diff is input for a migration. It is not a patch that must apply unchanged.

## Agent prompt

> Update this repository's adopted harness to release v0.1.0 from https://github.com/kilinkis/harness-bootstrap. Read the target release's `HARNESS_CHANGELOG.md` and `docs/upgrading.md`. Inspect the current repository before changing it. Preserve product code, project-specific commands, target inventory, feature state, progress history, and local configuration. Adapt only missing harness behavior. Run the adoption audit and the repository's full verification gate. Update `HARNESS_VERSION` only after verification passes. Deliver the change through this repository's normal work-item and pull-request workflow.

For release publication rules, see [Harness Releases](releases.md).
