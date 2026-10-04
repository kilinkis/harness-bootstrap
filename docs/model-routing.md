# Model Routing

The harness assigns a capability tier to each task. It does not name a vendor, tool, or model. This keeps the core portable across agent tools. Use a cheaper model for simple work and a stronger model only where an error is expensive.

`harness.models.json` is the source of truth. The role files in `agents/` repeat each role's default tier. A harness test keeps them consistent.

## Cost tiers

| Cost tier | Meaning |
| --- | --- |
| `low` | The smallest, fastest model that follows instructions and reads files reliably. |
| `standard` | A general model that writes and tests code reliably. |
| `high` | The most capable model available. Use it only when an error is expensive. |

## Task tiers

| Task tier | Cost tier | Use |
| --- | --- | --- |
| `explore-report` | `low` | Search files, summarize context, collect command output, and write progress or evidence reports. |
| `implement` | `standard` | Plan one feature, change code and tests, and repair verification failures. |
| `review` | `standard` | Independently review a normal diff that matches no risky-review trigger. |
| `risky-review` | `high` | Independently review a diff that matches a risky-review trigger. |

## Role defaults

| Role | Default task tier |
| --- | --- |
| Coordinator | `explore-report` |
| Implementer | `implement` |
| Reviewer | `review`, or `risky-review` when a trigger matches |

A role can delegate a bounded sub-task at a lower tier. For example, the implementer can send a file search or an evidence summary to an `explore-report` worker. A delegated worker never approves work or runs the final gate.

## Risky-review escalation

The implementer checks the triggers in `riskyReview` before review handoff. Record the result in the implementation report:

```text
Review tier: risky-review (trigger: scripts/**)
```

Use `review` when no trigger matches. Escalate when either condition is true:

- A staged path matches a pattern in `riskyReview.paths`.
- The change meets a statement in `riskyReview.conditions`.

The reviewer can escalate a review that the implementer did not escalate. The reviewer cannot lower a recorded escalation. Do not escalate implementation by default. Repeated repair-loop failures on the same root cause are a reason to retry once at the next cost tier.

## Adapt the policy

Change triggers and tier descriptions in `harness.models.json` for each project. Keep the tier names stable so role files and tests stay valid. Keep vendor and model names out of this file.

Map cost tiers to the models of your tool in a local configuration or in the optional [model adapters](model-adapters.md) guide. A tool that cannot select a model per task can ignore the mapping. The gate does not depend on it.

Use [workflow metrics](workflow-metrics.md) to record the model and token use of each agent run. Compare runs before and after a routing change.
