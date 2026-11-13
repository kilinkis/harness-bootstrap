# Invoking-agent proof of concept

The agent you already use supplies the reasoning. Local commands manage the inventory exercise, validation, handoff, and review evidence. These commands make no model API calls and require no API key. The invoking agent still uses its normal account allowance and limits.

## Ask your agent to run it

Open this repository in your coding agent and paste:

> Run the inventory exercise with `pnpm -s poc:agent`. Start a session and read its task. Act as the implementer: repair the inventory through `write`, then run `check` and `handoff`. Delegate an independent reviewer with fresh context. Give it the session ID and instruct it to use only `read`, `check`, and `review`; do not submit your own approval. After approval, run `finish`, summarize the result, and retain the completed session for inspection. Treat this as a fixture exercise, not repository delivery approval.

If your agent cannot delegate an independent reviewer, hand the session ID to another agent chat or a person. Stop before completion until that reviewer submits a verdict. The CLI does not launch or authenticate agents.

## Commands

Use Node 24 and `pnpm install --frozen-lockfile`. Run commands from the repository. `pnpm -s` keeps stdout suitable for JSON consumers. Running `pnpm poc:agent` without arguments prints help; it does not run a scripted solution.

```sh
pnpm -s poc:agent start
pnpm -s poc:agent read SESSION_ID
pnpm -s poc:agent write SESSION_ID < candidate.json
pnpm -s poc:agent check SESSION_ID
pnpm -s poc:agent handoff SESSION_ID
```

Replace `SESSION_ID` with the UUID returned by `start`. The candidate must contain the entire inventory JSON. The invoking agent can supply it with a heredoc instead of creating a file. It cannot select a destination path through the command.

The independent reviewer then runs:

```sh
pnpm -s poc:agent read SESSION_ID
pnpm -s poc:agent check SESSION_ID
pnpm -s poc:agent review SESSION_ID <<'JSON'
{"verdict":"approved","digest":"DIGEST_FROM_CHECK","reason":"Explain the independent review findings."}
JSON
```

Use the exact current digest returned by `check`. A reviewer can submit `changes_requested` with the current digest and a reason. Rejection returns the session to implementation and clears its checks. The implementer must check and hand off again before another review.

After approval, the implementer runs:

```sh
pnpm -s poc:agent finish SESSION_ID
pnpm -s poc:agent read SESSION_ID
pnpm -s poc:agent clean SESSION_ID
```

`finish` returns `passed: true` only after final validation. It requires successful implementer and reviewer checks for the current bytes and a matching approval. `check` reports its result under `check.passed`; a failed check exits nonzero. Invalid commands and rejected transitions also exit nonzero. `clean` deletes only that session, including malformed session data. It is optional; retain a completed session if you want to inspect its evidence.

## State and boundaries

Sessions live under `.task-harness/agent-poc/` in this repository, which Git ignores. Separate invocations use the same state. Writes replace the state file atomically. A per-session lock rejects concurrent operations. If a process is killed, a `.lock` file may remain; remove only that session's lock after confirming no command is still running. The CLI does not automatically break locks.

The implementer can replace only the session's inventory data. Handoff freezes editing through the CLI and switches subsequent checks to the reviewer role. Each check builds a temporary fixture and calls the existing `validateTargetInventory` function. The fixture is deleted afterward. Declared test and build commands are data and are never executed.

This is a trusted local workflow. Phase restrictions do not authenticate reviewer identity. An agent or person with filesystem access can edit session files directly or invoke a reviewer command themselves. The invoking environment must supply actual reviewer independence. This PoC is not a security sandbox or a general ticket runner.

The inventory digest identifies only the inventory bytes. It does not replace the repository's whole-index review digest, independent approval report, full gate, or required CI checks. A completed fixture does not approve a real feature. Inventory validation checks structure and target coverage, not command correctness.

## Result of the experiment

The original TanStack runtime experiment is preserved at commit `f940abe`. This revision uses the invoking agent, so the model SDK and direct Anthropic mode have been removed. Zod validates local command and state inputs; the remaining implementation uses Node APIs and the existing inventory validator. `pnpm poc:agent` replaces `pnpm poc:tanstack`.

The comparison shows where the boundary sits: an external agent already supplies model access, tool selection, and delegation. The repository needs deterministic commands and persistent evidence for this exercise. It can add an MCP interface later if that improves the calling experience; this PoC uses ordinary CLI calls.

Implementation and independent-review evidence are recorded in `progress/impl_TASK-041.md` and `progress/review_TASK-041.md`.
