# Target Inventory

`harness.targets.json` records the verification decisions for one repository. The adoption audit proposes entries. A person or responsible agent must approve each decision before the inventory becomes evidence.

The schema is in `harness.targets.schema.json`. Version 1 requires these fields for each target:

| Field | Meaning |
| --- | --- |
| `path` | Repository-relative package path. Use `.` for the root package. |
| `packageName` | Package name, or `null` when no name exists. |
| `deployable` | `true` when this target creates a deployed artifact. |
| `typecheck` | Exact command, or a non-applicable reason. |
| `test` | Exact command, or a non-applicable reason. |
| `build` | Exact production-build command, or a non-applicable reason. |

A decision has exactly one form:

```json
{ "command": "pnpm --filter @example/web run build" }
```

```json
{ "notApplicable": "This package is compiled by the web application." }
```

A deployable target must have a build command. It cannot use a non-applicable build reason.

## Approval procedure

1. Run `pnpm run audit:adoption`.
2. Copy the proposed targets to `harness.targets.json`.
3. Replace every `reviewRequired` value with an exact command or a non-applicable reason.
4. Set `deployable` to `true` or `false` for every target.
5. Confirm that each command runs from the stated repository root.
6. Run the audit again.
7. Resolve every inventory finding.

The `pnpm run check:targets` command validates the approved inventory in the standard gate. It fails when discovery and the inventory differ. It also fails when the inventory is malformed or incomplete.

The check validates declarations. It does not execute commands from the inventory. Connect the approved commands to `verify:project`. Prove that each required failure blocks that command.

Update the inventory when a package is added, removed, renamed, deployed, or no longer deployed. Also update it when a verification command changes.

## Workspace discovery support

The audit discovers the root package and packages declared in `pnpm-workspace.yaml`. It does not discover workspaces from other package managers.

The workspace file must contain one YAML mapping with a non-empty `packages` list. Block lists, flow lists, quoted patterns, comments, and unrelated pnpm settings are supported. Each pattern must be a non-empty single-line string without a null character. YAML parsing uses the [yaml package's document API](https://eemeli.org/yaml/#parsing-documents), including its parser diagnostics and default alias-expansion limit.

Malformed YAML, duplicate keys, multiple documents, invalid list entries, and unsupported tags or directives produce `WORKSPACE_CONFIG_INVALID`. The audit does not use a partial package list when parsing or list validation fails. This finding also fails `check:targets`, even when the existing inventory covers every target that was discovered.

Patterns that can leave the repository produce `WORKSPACE_PATTERN_UNSAFE`. Exclusion patterns beginning with `!` produce `WORKSPACE_PATTERN_UNSUPPORTED`; they require a manual coverage decision. Unmatched patterns produce `WORKSPACE_PATTERN_UNRESOLVED`. Resolve these findings before treating the inventory as complete.
