# Optional MCP Integrations

MCP servers are optional capabilities for projects that need them. They are not part of this harness's baseline: every added tool increases setup requirements, permissions, and the amount of context an agent must manage.

Adopt an MCP server only when it supports a concrete verification or development task in the target project.

## Chrome DevTools MCP

Use [Chrome DevTools MCP](https://developer.chrome.com/docs/devtools/agents/get-started) for a project with a browser UI when an agent needs to inspect a live page, diagnose browser console or network failures, record performance traces, or validate a real user flow.

It is not useful for the dependency-free CLI demonstration in this repository, and it should not be installed merely because it is available.

### Add it to an agent runner

Chrome DevTools MCP requires Node.js, pnpm, and a current Chrome installation. For Codex, configure it with:

```bash
codex mcp add chrome-devtools -- pnpm dlx chrome-devtools-mcp@latest
```

For another MCP-compatible client, use the configuration documented by the [Chrome DevTools MCP project](https://github.com/ChromeDevTools/chrome-devtools-mcp).

### Safe operating rules

- Use a dedicated Chrome profile for agent-driven browsing. Do not connect an agent to a browser profile containing personal, production, or privileged sessions.
- Assume an agent can read and interact with every page in the connected browser. Treat page contents, browser storage, and remote-debugging endpoints as sensitive.
- Ask for human confirmation before actions with an external effect, such as publishing, sending a form, changing an account, or entering credentials.
- Keep browser verification scoped to the acceptance criteria. Record the checked URL, action, and outcome in the implementation report.
- Remove the integration when it no longer has a concrete purpose; it is better to keep the harness small than to accumulate inactive tools.

## Choosing other MCP servers

Before adding any MCP server, define the job it performs, the data it can access, the permissions it needs, and the verification evidence it will produce. Add its setup and safety constraints to the target project's docs—not to this template unless the capability is broadly reusable.
