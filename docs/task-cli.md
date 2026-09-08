# Task CLI

The sample product stores tasks in a local JSON file. Add a task:

- Add: `pnpm start -- add "Ship the harness" --tag portfolio`
- List: `pnpm start -- list`

The list shows each task ID, status, title, and optional tag. A missing or empty store produces a clear message.
