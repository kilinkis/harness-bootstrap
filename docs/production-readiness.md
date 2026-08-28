# Production-Readiness Checklist

Use this checklist when you adapt the harness to a real product. Select gates that address credible product risks. Do not add a gate only because it appears in this document.

## Record a status

Give each reviewed item one status:

| Status | Required evidence |
| --- | --- |
| Applicable | Explain the failure that the gate must prevent. |
| Not applicable | Record why the risk does not apply. |
| Planned | Link an owner and a tracked work item. |
| Enforced | Link the executable check and required CI gate. |

Do not treat `Applicable` as complete. Move the item to `Planned` or `Enforced`. Review `Not applicable` decisions when the architecture or product scope changes.

Use this table to record the result:

| Gate | Status | Evidence or reason | Owner or work item |
| --- | --- | --- | --- |
| Example: API latency | Planned | p95 must stay below the product target | ISSUE-123 |

## Review the risk areas

### Correctness and coverage

- [ ] Identify critical behavior that needs unit, integration, acceptance, property, or mutation tests.
- [ ] Set a coverage policy only when the metric protects important behavior.
- [ ] Test failure paths, boundaries, and state transitions.
- [ ] Add schema or contract checks at system boundaries.

### Security and dependency safety

- [ ] Add secret scanning and dependency vulnerability checks.
- [ ] Add static or dynamic security analysis where the threat model requires it.
- [ ] Test authentication, authorization, input validation, and output encoding.
- [ ] Define how the team reviews and expires security exceptions.

### Performance and capacity

- [ ] Define latency, throughput, memory, and resource targets for critical paths.
- [ ] Add repeatable benchmarks or load tests.
- [ ] Detect regressions against a stable baseline or budget.
- [ ] Test expected peak load and failure behavior under pressure.

### Accessibility

- [ ] Select the applicable accessibility standard and conformance level.
- [ ] Add automated checks for detectable violations.
- [ ] Test keyboard, focus, contrast, semantics, and assistive-technology flows where applicable.
- [ ] Record the manual checks that automation cannot replace.

### Domain-specific acceptance

- [ ] Convert critical business rules into executable acceptance tests.
- [ ] Test domain invariants and prohibited state transitions.
- [ ] Use representative fixtures for regulated or high-risk workflows.
- [ ] Identify the domain owner who can approve an exception.

### Observability and alerting

- [ ] Define the logs, metrics, and traces needed to diagnose critical failures.
- [ ] Test that important failure paths emit useful signals without secrets.
- [ ] Define service indicators, objectives, and actionable alerts where applicable.
- [ ] Link each production alert to an owner or runbook.

### Deployment and rollback

- [ ] Verify build artifacts and deployment configuration.
- [ ] Test database migrations and backward compatibility where applicable.
- [ ] Define a rollback or roll-forward procedure.
- [ ] Add smoke tests for the deployed environment.

### Data protection and recovery

- [ ] Classify sensitive data and define retention rules.
- [ ] Test backup creation and restoration.
- [ ] Define recovery time and recovery point targets where applicable.
- [ ] Verify destructive operations, access controls, and audit records.

### Cost and resource limits

- [ ] Define budgets for compute, storage, network use, external APIs, or model tokens.
- [ ] Add limits for unbounded work, retries, queues, and concurrency.
- [ ] Detect material cost regressions before release where practical.
- [ ] Define the owner and response for a budget breach.

### Operational documentation

- [ ] Document supported environments and required configuration.
- [ ] Document deployment, rollback, recovery, and incident procedures.
- [ ] Keep ownership and escalation paths current.
- [ ] Test commands and examples before release.

## Convert a risk into a gate

For each applicable risk, record these fields:

1. **Prevented failure:** What bad outcome does this gate stop?
2. **Threshold:** What measurable result passes?
3. **Command:** Which deterministic command evaluates the result?
4. **Harness integration:** Does `./scripts/verify.sh` run the command?
5. **CI enforcement:** Is the check required before merge?
6. **Contract test:** Does a test prove that the gate rejects a bad fixture?
7. **Exception owner:** Who can approve an exception, and when does it expire?

```text
Risk identified
→ measurable rule
→ executable check
→ harness contract test
→ required CI gate
```

A manual review can remain necessary. Label it as a manual checkpoint. Do not present it as a deterministic gate.

## Completion condition

The adoption review is complete when every relevant area has a recorded status. Each applicable risk must have an enforced gate or a planned work item with an owner. Keep the selected checks in the normal verification path. Remove checks that no longer protect a credible risk.
