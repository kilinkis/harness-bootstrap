# Verification

Run the full harness gate from the repository root:

```bash
./scripts/verify.sh
```

The gate validates `feature_list.json`, runs TypeScript type checking, and runs the Node test suite. For a feature, add the smallest focused command that demonstrates its behavior, then run the full gate.

Record exact commands and exit results in the implementation report. A passing command run before a change is not evidence for the final state.
