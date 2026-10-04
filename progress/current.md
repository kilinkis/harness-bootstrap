# Current Session

Active feature: TASK-040, tracked by issue #96. Status: in progress.

## Plan

1. Add `harness.models.json` with cost tiers, task tiers, risky-review triggers, and role defaults. Use no vendor, tool, or model names.
2. Add a `Model tier` line to each role file in `agents/`.
3. Add `docs/model-routing.md` for the policy and `docs/model-adapters.md` for optional per-tool mappings.
4. Link the guides from `AGENTS.md` and the adoption map.
5. Add `tests/harness/model-routing.test.ts` for config shape, role consistency, and vendor neutrality.

Unrelated output/ and tmp/ remain untouched.
