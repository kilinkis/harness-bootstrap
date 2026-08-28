# Implementation Report — TASK-007

## Scope

Added practical technical prose rules that use ASD-STE100 principles. The rules apply to durable repository text. They do not claim full compliance. Commit subjects and chat replies have separate scope decisions.

## Files changed

- `docs/conventions.md` — added the prose rules, scope, compliance boundary, commit rule, and official references.
- `AGENTS.md` — added one pointer to the detailed convention.
- `feature_list.json` and `progress/current.md` — recorded TASK-007 and its plan.

## Commands and results

- `./scripts/verify.sh` before implementation — passed after a sandbox-only IPC failure was rerun with the required permission. TypeScript, ESLint, and Fallow passed. Seven product tests and four harness tests passed.
- `git diff --check` — passed.
- `rg -n "Technical prose|ASD-STE100|imperative mood|chat replies" AGENTS.md docs/conventions.md` — passed and found each required policy element.
- `./scripts/verify.sh` after implementation — passed. Fallow found no issues in four changed files. Seven product tests and four harness tests passed.
- `./scripts/verify.sh` after review and completion-state updates — passed. Fallow found no issues in seven changed files. Seven product tests and four harness tests passed.

## Tests

No automated test was added. This change contains policy text and links. The focused text check and full repository gate cover the applicable verification.

## Sources

- https://www.asd-ste100.org/about_STE.html
- https://www.asd-ste100.org/STE_faq.html
- https://www.asd-ste100.org/STE_downloads.html

## Remaining risks

The rules improve consistency but do not automatically validate vocabulary against the ASD-STE100 dictionary. The convention forbids a compliance claim without that validation.
