# Conventions

- Use TypeScript with strict compiler checks. Add a dependency only when a feature explicitly justifies it.
- Prefer small functions with explicit inputs and outputs.
- Use explicit TypeScript types for public functions and domain data structures.
- Keep CLI output human-readable and errors on stderr.
- Test observable behavior, including failure modes.
- Name reports with the feature ID: `impl_TASK-003.md`, `review_TASK-003.md`.
- Do not edit a reviewer report after it is written; add a follow-up report if circumstances change.
