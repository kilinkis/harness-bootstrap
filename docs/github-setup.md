# GitHub Setup

The files in `.github/` travel with this repository. Repository settings—rulesets, permissions, secrets, and required-check configuration—do not. Configure them after creating a new GitHub repository from this template.

## Included files

- `.github/ISSUE_TEMPLATE/feature.yml` prompts for a scoped, verifiable feature.
- `.github/pull_request_template.md` prompts for traceability and harness evidence.
- `.github/workflows/verify.yml` publishes the `harness-gate` check for pushes to `main` and pull requests.

## Lightweight protected-main ruleset

For a solo repository, start with a branch ruleset targeting `main`:

1. Require changes through a pull request.
2. Require the `harness-gate` status check.
3. Set required approving reviews to zero if you do not have a regular human reviewer. The harness review report still provides a separate review artifact, but it is not a GitHub approval.
4. Block force pushes and branch deletion.
5. Avoid bypass actors unless you have a documented recovery path.

Create the workflow on the default branch and let it run once before selecting `harness-gate` as required. GitHub can only require a check it recognizes from recent repository activity.

GitHub may offer an additional approval requirement for changes generated without an attributable user. Treat that as a repository policy choice: it strengthens human oversight but can prevent fully autonomous merging in a one-person repository.

Configure the ruleset under **Settings → Rules → Rulesets**, or with the GitHub API. Afterward, inspect the active rule on `main`:

```bash
gh api repos/OWNER/REPOSITORY/rules/branches/main
```

Remote protection is the enforcement layer. `AGENTS.md`, `CHECKPOINTS.md`, and the templates explain the expected behavior even on platforms that do not support the same controls.

## Repository instructions versus local configuration

Commit shared process, architecture, verification commands, and role boundaries to this repository. Keep these outside it:

- Git identity and signing keys
- GitHub credentials and account selection
- Agent permissions and sandbox approvals
- Personal aliases, preferred tools, and machine paths

That separation makes the harness portable without leaking credentials or imposing one contributor's environment on everyone else.
