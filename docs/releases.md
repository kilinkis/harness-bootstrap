# Harness Releases

Harness releases use immutable annotated Git tags. The tag name must equal the trimmed value in `HARNESS_VERSION`.

## Prepare a release

1. Select the next semantic version.
2. Update `HARNESS_VERSION`.
3. Add a matching level-two entry to `HARNESS_CHANGELOG.md`.
4. State behavior changes, compatibility risks, and adopter actions.
5. Run `pnpm run check:release`.
6. Complete the normal issue, review, pull-request, and merge workflow.

## Publish a release

Run these commands from the verified default branch. Replace the example version with the value in `HARNESS_VERSION`.

```bash
git tag -a v0.2.0 -m "Harness v0.2.0"
git push origin v0.2.0
gh release create v0.2.0 --title "v0.2.0" --generate-notes
```

Copy the matching changelog entry into the GitHub release description when generated notes do not include the required adopter actions.

Do not move or replace a published release tag. Publish a new patch release when release metadata or harness content needs correction.
