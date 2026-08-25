# Completion Checkpoints

A feature can move to `done` only when every applicable checkpoint is true.

- [ ] Its acceptance criteria in `feature_list.json` are satisfied.
- [ ] The change is scoped: no unrelated refactors or generated artifacts.
- [ ] Tests cover the behavior or the report explains why tests are not applicable.
- [ ] `./scripts/verify.sh` exits successfully.
- [ ] An implementation report exists in `progress/`.
- [ ] An independent review report exists in `progress/` and has no unresolved blocking finding.
- [ ] `progress/current.md` and `progress/history.md` accurately reflect the outcome.

If a checkpoint cannot be satisfied, leave the item active and document the blocker. Do not quietly downgrade the requirement.
