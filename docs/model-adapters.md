# Model Adapters

This guide is optional. The core harness uses the cost tiers in `harness.models.json` and does not depend on a tool. Use an adapter only when your agent tool can select a model per role or per sub-task.

## Write an adapter

1. Read the cost tiers in [model routing](model-routing.md).
2. For each cost tier, select one model that your tool supports.
3. Put the mapping in the tool's own configuration, not in `harness.models.json`.
4. Point each role definition in the tool at the model for its task tier.
5. Record the provider and model of each agent run with `pnpm run metrics:agent`.

Keep tool-specific files outside the copied harness core. A project that changes tools then replaces only its adapter.

## Mapping template

Copy this table into the project's local notes or tool configuration and fill in the model column.

| Cost tier | Task tiers | Model in your tool |
| --- | --- | --- |
| `low` | `explore-report` | |
| `standard` | `implement`, `review` | |
| `high` | `risky-review` | |

## Example families

Model names change often. These rows show the intended size class only. Check the provider's current model list before you configure a tool.

| Cost tier | Size class |
| --- | --- |
| `low` | A small or "mini" model from the provider |
| `standard` | The provider's general-purpose coding model |
| `high` | The provider's largest or reasoning-focused model |

If the tool has only one model, use it for all tiers. The policy still tells a person where review needs extra attention.
