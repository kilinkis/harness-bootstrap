# Parallel Worktrees

Use Git worktrees when independent tickets can progress at the same time. A worktree gives each agent a separate directory and branch. It does not provide a global task lock or remove the normal harness gates.

The default harness uses one workstream. Keep that model until parallel work has a clear benefit.

## Decide if work can run in parallel

Use separate worktrees when all of these conditions are true:

- Each ticket has independent acceptance criteria.
- Each ticket can pass verification without an unmerged change from another ticket.
- The tickets do not change the same product boundary or data migration.
- The issue tracker shows a different owner for each ticket.
- Each agent can use a separate worktree.

Keep work sequential when tickets have an implementation order. Also keep work sequential when they modify the same files or require one combined design decision.

## Use one isolated workstream

Use one ticket, branch, worktree, and agent for each workstream. Do not run two agents in the same worktree.

The one-active-feature rule still applies inside each branch. The validator reads only the current worktree. It cannot detect an active feature on another unmerged branch.

Use the issue tracker as the global claim system:

1. Confirm that the issue is unassigned and has no active branch or pull request.
2. Assign the issue before creating the worktree.
3. Add the repository's active-work label if one exists.
4. Record the branch or worktree in an issue comment.
5. Start work only after the claim is visible to other contributors and agents.

For GitHub, this command assigns an existing issue to the authenticated user:

```bash
gh issue edit 12 --add-assignee @me
```

The assignment is the coordination record. The status in `feature_list.json` remains branch-local until merge.

## Create a worktree

Run these commands from the primary checkout. Replace the ticket number, branch name, and directory with explicit values.

```bash
git fetch origin
git worktree add ../harness-TASK-012 -b feature/TASK-012-short-name origin/main
git -C ../harness-TASK-012 status --short --branch
```

Then enter the new worktree. Install dependencies when the project does not share them across directories.

```bash
cd ../harness-TASK-012
pnpm install --frozen-lockfile
./scripts/verify.sh
```

Do not create a worktree from a stale local branch. Do not use the same branch in two worktrees.

List all registered worktrees at any time:

```bash
git worktree list
```

## Run the normal harness loop

Each worktree follows the complete ticket lifecycle:

1. Mark only its selected feature `in_progress`.
2. Write that feature's plan to `progress/current.md`.
3. Implement and run focused checks.
4. Run `pnpm run feedback` before review.
5. Write the implementation report.
6. Complete an independent review and its report.
7. Run `./scripts/verify.sh` on the final state.
8. Open a pull request that closes the claimed issue.
9. Merge only after required remote checks pass.

Never treat another worktree's passing gate as evidence for the current worktree.

## Update before merge

Another parallel pull request can merge first. Update the remaining branch before its final gate:

```bash
git fetch origin
git merge --no-edit origin/main
./scripts/verify.sh
```

Stop if the merge reports a conflict. Inspect the competing changes before you resolve it. Do not discard another workstream's completed state.

Conflicts are most likely in these files:

- `feature_list.json`: keep completed items from `main` and the current branch's feature state.
- `progress/current.md`: describe only the current branch's active feature. After completion, record no active feature and summarize the current feature.
- `progress/history.md`: preserve entries from both branches.
- Shared product files: resolve them from the accepted behavior, not from file order.

Run the full gate again after every conflict resolution. Request another review when a resolution changes implementation behavior.

## Remove a finished worktree

Inspect the target before removal:

```bash
git -C ../harness-TASK-012 status --short --branch
git worktree list
```

Remove the worktree only after its changes are committed and its branch is merged or otherwise preserved:

```bash
git worktree remove ../harness-TASK-012
git worktree prune
```

Do not use `--force` to bypass uncommitted changes. Do not delete a worktree directory directly.

## Limits of this mode

This guide does not add a parallel scheduler or a cross-branch lock. The issue tracker supplies global coordination. Git supplies directory and branch isolation. The harness supplies scope, evidence, review, and verification inside each worktree.

If parallel conflicts become common, return to sequential work. A high conflict rate means the tickets are not independent enough for this mode.
