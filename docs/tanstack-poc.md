# TanStack harness proof of concept

This experiment asks whether TanStack can run our implementer and reviewer roles while our existing validators remain authoritative. It repairs a malformed target inventory in a temporary project. It does not implement arbitrary repository tickets.

## Run

Use Node 24 and install dependencies with `pnpm install --frozen-lockfile`.

```sh
pnpm poc:tanstack
```

The default mode uses TanStack's scripted model adapter. It needs no credentials or network. The harness sessions, tools, file writes, and inventory validator are real. A passing run prints JSON with `mode: "scripted"`, `passed: true`, initial findings, the final inventory, a review digest, and the tool trace. The temporary workspace is removed before the result is printed. Save stdout if you need a durable run record.

For Anthropic, set `ANTHROPIC_API_KEY` through your environment and select a model supported by the pinned adapter:

```sh
export ANTHROPIC_MODEL=claude-sonnet-5-5
pnpm poc:tanstack --live
```

The model above appears in the installed adapter's model list. Your account must have access to it. Both roles use that model with separate adapters, hosts, and conversations. The model choice is explicit and does not change `harness.models.json`. Live mode sends only the synthetic fixture, inventory schema, prompts, and tool results to Anthropic. API calls incur provider charges. The CLI does not read `.env` files or store credentials. Missing configuration exits with an error before creating the fixture.

## Execution

1. Create a temporary package with an invalid `harness.targets.json`.
2. Open an implementer session. It can read fixture context, replace the inventory, and call `validateTargetInventory` through a tool.
3. Close that host and open a reviewer session with fresh context. It can read, validate, and submit a verdict. Its tool set has no write operation.
4. Run the validator again in host code. Success requires both roles to have checked the final digest, exactly one approved review bound to that digest, and no final findings.
5. Close sessions and remove the temporary project on success or failure.

Each role has at most eight model/tool iterations and a 120-second cancellation timer. Failed operations exit nonzero. Model prose cannot supply a missing successful check or review.

The tools accept no paths or shell commands. Only the temporary inventory can be changed, and its contents are treated as data. Declared test and build commands are never executed. This is a bounded configuration exercise, not an operating-system sandbox for arbitrary generated code.

## What this demonstrates

| Responsibility | Implementation |
| --- | --- |
| Model calls, tool dispatch, conversation state, tool events | TanStack AI and harness |
| Separate implementer and reviewer contexts | Two TanStack hosts with explicit role tool sets |
| Target inventory rules | Existing `scripts/adoption-audit.ts` validator |
| Handoff order and final success decision | Small PoC runner |
| Review snapshot association | SHA-256 of the temporary inventory bytes |
| Normal repository delivery | Existing queue, staged Git digest, independent review, full gate, and CI |

The exercise digest is not the repository's whole-index review digest. A passing PoC does not approve this branch or any real feature. Inventory validation proves structure and target coverage; it does not prove the declared commands are correct or execute them.

The scripted run demonstrates integration behavior, not model reasoning quality. A live Anthropic run was not performed during implementation because the environment had no API key. The focused tests cover successful handoff, a forbidden reviewer write request, invalid inventory, missing or conflicting review evidence, stale digests, provider errors, and cleanup.

## Versions and limits

Direct dependencies are pinned: `@tanstack/ai-harness` 0.1.0; `@tanstack/ai`, `@tanstack/ai-persistence`, and `@tanstack/ai-anthropic` 1.0.0; `zod` 4.6.7. The harness package is experimental. Its documentation permits breaking changes in minor releases.

Persistence is in memory. The PoC does not demonstrate recovery after process failure, durable approvals, multi-user access, coding sandboxes, Git automation, or automatic delivery. It runs one bounded attempt per role; the existing three-attempt repository repair policy still governs development of the PoC itself.

A useful next experiment would run one real ticket in a separate Git worktree, expose the existing focused checks and review-digest commands, and compare coordination cost against the current workflow. That needs explicit tool permissions and durable session storage before it becomes a general ticket runner.

## Sources

- [Harness sessions and lifecycle](https://tanstack.com/ai/latest/docs/harness/overview)
- [Server tool definitions](https://tanstack.com/ai/latest/docs/tools/server-tools)
- [Scripted model testing](https://tanstack.com/ai/latest/docs/advanced/testing)
- Published package sources: `@tanstack/ai-harness/src/define.ts`, `src/types.ts`, `src/host.ts`; `@tanstack/ai/src/testing/fake-text.ts`; `@tanstack/ai-anthropic/src/model-meta.ts`.

The installed core skill still labels itself 0.42.0 although the package is 1.0.0. APIs used here were also checked against the installed source and TypeScript compiler. Intent's configuration installer was canceled without changes; package skill guidance was loaded directly with `pnpm dlx @tanstack/intent@latest load @tanstack/ai#ai-core`.
