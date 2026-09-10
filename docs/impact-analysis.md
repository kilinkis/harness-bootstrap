# Advisory Impact Analysis

Impact analysis selects useful focused checks for a change. It does not replace the full merge gate.

Run it against the default branch:

```bash
pnpm run impact --base origin/main
```

Use JSON when another tool must read the result:

```bash
pnpm --silent run impact --json --base origin/main
```

The command uses the [shared comparison baseline](verification.md#comparison-baseline): explicit `--base`, then `HARNESS_BASE_REF`, then `origin/main`. It resolves the selected target's common ancestor with `HEAD` and reads tracked changes against that commit. An all-zero first-push SHA selects every tracked path. It also reads untracked files that Git does not ignore. It treats each side of a move as a changed path. It maps each path to the most specific discovered target. It then follows package dependencies in reverse to find workspace consumers. A root package-manager or TypeScript configuration change affects every target.

Each affected target contains:

- The target path and package name.
- Direct-change or dependency reasons.
- Approved type-check, test, and build commands from `harness.targets.json`.

The command reports uncertainty when the target inventory is invalid or incomplete. It also reports uncertainty when it cannot read dependency data or a safe changed path. It does not execute any reported command.

## Safe use

Use the result to choose the first focused checks during implementation. For example, a shared UI package change can select that package's tests and each consuming application's build.

The implementer runs `./scripts/verify.sh` after approval, and CI runs it before merge. The result always contains `fullGateRequired: true`. Do not use this advisory graph to skip a required merge check.

Dependency inference can miss relationships that do not appear in package manifests. Examples include generated files, runtime module loading, shared environment configuration, and deployment-provider behavior. Keep a conservative full gate until the project has separate evidence that selective CI is safe.

This guide is optional context. Agents do not need to read it unless they are selecting focused checks or investigating affected targets.
