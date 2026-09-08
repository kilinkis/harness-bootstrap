# Harness Adoption Checklist

> Do not trust a green harness gate until this checklist is complete for the target repository.

The bootstrap gate verifies the sample project only. It does not prove that another repository can build or deploy. Complete this checklist when you copy or adapt the harness.

## 1. Inventory verification targets

List every deployable application. Also list each workspace that can affect a deployable application.

Do not assume that a root TypeScript command includes nested workspaces. Do not omit a required check because a recursive tool skips missing scripts.

| Target | Path | Deployable | Type check | Tests | Production build | Required CI check | Deployment evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Example web app | `apps/web` | Yes | `pnpm --filter web typecheck` | `pnpm --filter web test` | `pnpm --filter web build` | `harness-gate` | Preview deployment |
| Example shared package | `packages/data` | No | `pnpm --filter data typecheck` | `pnpm --filter data test` | Not applicable: library source is bundled by the web app | `harness-gate` | Not applicable: not deployed |

Use one of these values for each cell:

- An exact command or evidence link.
- `Planned`, with an owner and work item.
- `Not applicable`, with a reason.

An empty cell is an incomplete adoption decision.

## 2. Define project verification

Create a project-owned command that covers all targets. Use a name such as `verify:project`. Select commands that match the repository's build graph.

Possible implementations include TypeScript project references, workspace scripts, Turborepo, Nx, or another project tool. Do not add one of these tools only for the harness.

For a pnpm project, the final composition can use this shape:

```json
{
  "scripts": {
    "feedback": "...fast checks...",
    "verify:project": "...all required type checks, tests, and production builds...",
    "verify": "pnpm run feedback && pnpm run verify:project && pnpm run test:harness"
  }
}
```

Keep a slow production build in the full gate. Keep it out of `feedback` when its duration harms the inner loop.

The full `./scripts/verify.sh` command must execute `verify:project`. CI must execute `./scripts/verify.sh` from the intended repository root.

## 3. Verify workspace coverage

- [ ] Each deployable application has an exact type-check command.
- [ ] Each shared workspace that affects a deployable application has an exact type-check decision.
- [ ] Each required workspace command exists and runs in CI.
- [ ] Generated types and build prerequisites are available before type checking.
- [ ] The selected command follows the repository's dependency order where required.
- [ ] A root configuration is not treated as workspace coverage without evidence.

Record the evidence:

| Question | Result |
| --- | --- |
| Which command checks all required workspaces? | TODO |
| How was complete workspace coverage confirmed? | TODO |
| Which workspaces are excluded, and why? | TODO |

## 4. Verify production builds

- [ ] Each deployable target runs its exact production build in the full gate.
- [ ] The build uses the committed lockfile.
- [ ] The build rejects compilation and configuration errors.
- [ ] The build does not suppress required type or lint failures.
- [ ] Required build-time environment variables have a safe CI value or a validated schema.
- [ ] Build artifacts are created from the same package root used by the deployment provider.

Record the evidence:

| Deployable target | Production command | Result | Artifact or output |
| --- | --- | --- | --- |
| TODO | TODO | TODO | TODO |

## 5. Match CI and deployment

Compare the full gate with the deployment provider.

| Setting | CI | Deployment provider | Match or reason |
| --- | --- | --- | --- |
| Working directory | TODO | TODO | TODO |
| Install command | TODO | TODO | TODO |
| Package manager and version | TODO | TODO | TODO |
| Runtime and version | TODO | TODO | TODO |
| Build command | TODO | TODO | TODO |
| Build-time environment schema | TODO | TODO | TODO |

- [ ] The pull request runs the full repository gate.
- [ ] The deployment preview status is required before merge when the provider supplies one.
- [ ] A preview smoke test checks a critical route or operation when practical.
- [ ] A production-only difference has an explicit test, manual checkpoint, or risk owner.

The provider check complements the repository gate. It does not replace the local production build.

## 6. Prove that failure blocks delivery

A passing run is not sufficient evidence. Perform a deliberate negative test for each deployable build path.

1. Create a temporary branch or uncommitted change.
2. Introduce a known compilation or build-configuration failure.
3. Run `./scripts/verify.sh`.
4. Confirm that the command exits with a non-zero status before merge.
5. Restore the intentional failure.
6. Run `./scripts/verify.sh` again.
7. Record both results in the adoption work item.

Do not commit the intentional failure. Do not weaken the gate to make the negative test pass.

Record the evidence:

| Target | Intentional failure | Failing command and result | Restored gate result |
| --- | --- | --- | --- |
| TODO | TODO | TODO | TODO |

## 7. Protect the delivery boundary

- [ ] Branch protection requires the full harness gate.
- [ ] Branch protection requires the deployment preview when applicable.
- [ ] The pull request records affected deployable targets.
- [ ] The pull request records the production-build result.
- [ ] The pull request records remaining deployment differences or risks.

## Completion condition

Adoption is complete only when all applicable items have evidence. Every deployable target must have a production build in the full gate. Every relevant workspace must have a type-check decision. Every required check must fail when its protected condition is broken.

After this checklist is complete, continue with the broader [production-readiness checklist](docs/production-readiness.md). That checklist covers security, performance, accessibility, observability, recovery, cost, and domain-specific gates.
