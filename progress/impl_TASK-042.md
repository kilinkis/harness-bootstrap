# Implementation: TASK-042

## Scope

Limit changed staged authored files to 5,000 estimated tokens (20,000 bytes). Read Git blob sizes and staged generated/vendored attributes. Install a dependency-free Node 24 pre-commit hook and provide explicit split instructions.

Review tier: risky-review (trigger: scripts/**).

## Files changed

- `.githooks/pre-commit` and `scripts/check-staged-file-size.ts`: hook and index-only byte check.
- `.gitattributes`: common lockfile and generated-output exceptions.
- `tests/harness/staged-file-size.test.ts`: isolated Git fixtures and real commit checks.
- `package.json`: discoverable manual check command.
- `README.md` and `docs/pre-commit.md`: installation, exclusions, limits, and split guidance.
- `feature_list.json` and `progress/`: local work item and delivery evidence.

## Commands and results

- Startup `pnpm run feedback`: passed, including 7 product tests. Initial sandbox run could not create the tsx IPC socket; reran with permission.
- Implementation `pnpm run feedback`: passed, including 7 product tests; final log `/tmp/task-042-feedback-final.log`.
- `node --test tests/harness/staged-file-size.test.ts`: passed 2 tests; log `/tmp/task-042-focused.log`.
- `git config --local core.hooksPath .githooks`: succeeded. No custom hook configuration or executable pre-commit hook existed before installation.
- `git diff --check`: passed.
- Independent review: approved in `progress/review_TASK-042.md`; reviewer tests passed 2/2.
- Final `./scripts/verify.sh`: passed, 7 product tests and 109 harness tests; log `/tmp/task-042-full.log`.
- `node scripts/check-staged-file-size.ts`: correctly rejected only `feature_list.json` at 37,294 bytes before evidence finalization.

## Repair attempts

| Attempt | Command | Failure and evidence | Diagnosis and change | Result |
| --- | --- | --- | --- | --- |
| 1 | Focused tests | `git mv -leading.txt renamed.txt` treated the path as an option | Added `--` to the fixture command | Rename check passed; next fixture cleanup failed |
| 2 | Focused tests | Git refused to delete a staged rename | Added `-f --` to deletion inside the disposable fixture | Passed 2 tests |

| 3 | `pnpm run feedback` | Fallow reported the hook CLI as unreachable | Added `check:staged-files` package command as a discoverable CLI entry point | Passed fast gate |

## Remaining risks

Git has no agent-authorship metadata. The rule covers all authored files with explicit generated and vendored exceptions. Local/global Git attributes and normal Git hook bypass options remain available; this is not a security boundary.

The existing `feature_list.json` exceeds 20,000 bytes and blocks committing this work. It is authored content and is not exempted. Recommend a separate queue-archive work item that preserves historical validation. No commit, PR, or merge can be completed through this hook until that scope is resolved. Unrelated `output/` and `tmp/` are preserved.

Implementation digest: sha256:0004843daf5d897d90bab16f3890c9b1bbc0d194360560644ac69427c7977f33
