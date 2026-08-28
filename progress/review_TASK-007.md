# Review Report — TASK-007

## Verdict

Approved. No blocking, major, or minor findings.

## Scope reviewed

- Issue #7 and TASK-007 acceptance criteria
- `docs/conventions.md` and `AGENTS.md`
- Implementation report and full diff
- Official STEMG overview, FAQ, and AI guidance

## Review results

- **Correctness:** The convention covers every accepted durable output. It gives commit messages a separate rule. It excludes chat replies.
- **Source accuracy:** The practical rules match STEMG guidance about short sentences, one topic per sentence, active voice, controlled terminology, and technical terms. The text does not claim full compliance.
- **Readability:** The detailed policy has six short rules. `AGENTS.md` contains only one pointer. The change does not add repeated instructions to prompts.
- **Architecture:** The policy belongs in the existing conventions document. No new file or dependency is necessary.
- **Security and performance:** The change adds documentation only. It adds no data flow, executable behavior, dependency, or runtime cost.
- **Verification:** A focused text check and the full harness gate are sufficient for this policy-only change.

## Commands and results

- `git diff --check` — passed.
- Full diff and implementation report inspected — no findings.
- `./scripts/verify.sh` — passed independently. TypeScript, ESLint, and Fallow passed. Seven product tests and four harness tests passed.

## Remaining risks

The repository does not include an ASD-STE100 vocabulary checker. The policy correctly describes the rules as principles and prevents an unverified compliance claim.
