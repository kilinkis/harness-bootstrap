# Implementation Report — TASK-006

## Scope

Documented a tool-neutral work-item-to-merge workflow and added GitHub templates and remote setup guidance. The normal agent prompt remains short because role selection, state persistence, required files, verification, and delivery rules live in the repository.

## Files changed

- `AGENTS.md` — added concise delivery rules and navigation.
- `CHECKPOINTS.md` — added pre-merge delivery checks.
- `README.md` — linked the runbook, clarified local configuration, and updated the repository map.
- `docs/run-a-ticket.md` — documented the lifecycle, state meanings, compact prompt, diagram, and GitHub command example.
- `docs/github-setup.md` — separated versioned files from remote-only GitHub rules and local credentials.
- `.github/ISSUE_TEMPLATE/feature.yml` — added a structured feature issue form.
- `.github/pull_request_template.md` — added traceability, evidence, and risk fields.
- `feature_list.json` and `progress/current.md` — recorded TASK-006 and its active plan.

## Commands and results

- `./scripts/verify.sh` before implementation — passed: queue validation, TypeScript, ESLint, Fallow, 7 product tests, and 4 harness tests.
- `ruby -e "...YAML.safe_load..."` — passed; the feature issue form is valid YAML and contains `name`, `description`, and an array `body`.
- `git diff --check` — passed with no whitespace errors.
- `./scripts/verify.sh` after implementation — passed: Fallow reported no issues in 9 changed files; 7 product tests and 4 harness tests passed.
- `./scripts/verify.sh` after review and completion-state updates — passed: Fallow reported no issues in 12 changed files; 7 product tests and 4 harness tests passed.

The first post-implementation gate attempt stopped because the sandbox denied Fallow permission to create a temporary Git worktree. The same command passed after it was rerun with the required Git worktree permission.

## Tests

No product test was added because this feature changes Markdown and GitHub template configuration, not runtime behavior. The existing full gate passed, and the new issue form received a focused YAML structure check. GitHub rendering and the remote required check will be confirmed through the pull request and after merge.

## Remaining risks

- GitHub rulesets are remote state and cannot be enforced by cloned files; the setup guide makes this explicit.
- GitHub may change settings labels or policy options over time. The guide describes intended rules rather than depending on screenshots.
