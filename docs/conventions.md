# Conventions

- Use TypeScript with strict compiler checks. Add a dependency only when a feature explicitly justifies it.
- Prefer small functions with explicit inputs and outputs.
- Use explicit TypeScript types for public functions and domain data structures.
- Keep CLI output human-readable and errors on stderr.
- Test observable behavior, including failure modes.
- Name reports with the feature ID: `impl_TASK-003.md`, `review_TASK-003.md`.
- Do not edit a reviewer report after it is written; add a follow-up report if circumstances change.

## Technical prose

Use clear technical English in durable repository text. This rule applies to documentation, issues, pull request descriptions, release notes, code comments, and progress reports.

- Prefer short sentences.
- Put one instruction or topic in each sentence.
- Use active voice when it makes the actor clear.
- Use one term for one concept.
- Avoid idioms, vague references, filler, and unnecessary synonyms.
- Keep necessary project terms. Define an unfamiliar term before you use it.

These rules apply principles from ASD-STE100 Simplified Technical English. They do not establish full ASD-STE100 compliance. Do not claim compliance unless the text is checked against the current standard and the project's approved terminology.

Use a separate rule for commit messages: write a short subject in the imperative mood. This repository convention does not control chat replies.

Official references:

- [About ASD-STE100](https://www.asd-ste100.org/about_STE.html)
- [ASD-STE100 FAQ](https://www.asd-ste100.org/STE_faq.html)
- [STEMG guidance for AI and Simplified Technical English](https://www.asd-ste100.org/STE_downloads.html)
