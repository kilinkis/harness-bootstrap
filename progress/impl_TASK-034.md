# Implementation: TASK-034

## Scope

Make the portable reviewer prompt explicit about coverage and actionable findings. The only implementation change is two paragraphs in agents/reviewer.md. No new agents, dependencies, test cases, or verification stages.

## Files changed

- agents/reviewer.md: correctness, simplicity, relevant security/performance, evidence, impact, severity, and Required/Optional labels. Required fixes block approval.
- feature_list.json and progress/: work item and evidence.

## Commands and results

- Manually compared the prompt with all three acceptance criteria: satisfied; existing review boundaries and checks remain.
- git diff --check: passed.
- pnpm run feedback: passed all checks and 7 product tests. Logs: /tmp/harness-review-start.log and /tmp/TASK-034-feedback.log.
- pnpm run review:digest: passed; digest below.

No prose-matching tests were added. Independent review approved the staged digest. The implementer ran `./scripts/verify.sh` once after approval: all checks, 7 product tests, and 94 harness tests passed. Full log: /tmp/TASK-034-final-full.log. After evidence finalization, `HARNESS_DELIVERY_PHASE=ci pnpm run check:delivery`, `pnpm run check:harness-state`, and `git diff --cached --check` passed.

Implementation digest: sha256:0e79ba98ec2e795d723399e5f7e2ea580489f034c846dfe7539238025783ccd9

## Remaining risks

Instructions guide judgment but cannot prove review quality or reviewer identity. No runtime behavior changed.
