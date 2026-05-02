## Why

The MLSpec CLI currently outputs only human-readable markdown, but the generated skill templates (from the 2.0.2 skill-layer-quality improvements) reference CLI commands like `mlspec next` and `mlspec status` as the primary source of workspace state. Without machine-readable output, skills must parse fragile markdown or fall back to direct file inspection, undermining the CLI-first routing design.

This change adds `--json` flags to key MLSpec CLI commands, making the CLI a reliable structured state oracle for skills and external automation.

## What Changes

- **`mlspec next --json`**: Returns structured next-action recommendations with `workspace_state` and `actions` array. Actions sorted by ascending priority. Each action includes `action_type` (explore/propose/run/resolve/bootstrap/none) and `suggested_command`.

- **`mlspec status [--json]`**: Returns workspace summary with recipes, experiments, counts, `current_best_recipes` (array), `current_best_recipe` (only when exactly one), warnings, errors.

- **`mlspec status --experiment <id> --json`**: Returns experiment-specific state including evidence stages (smoke/validation/final), recommendations, missing_stages, `ready_to_resolve`. This is a JSON-only sub-mode; without `--json`, it errors instructing user to pass `--json`.

- **`mlspec show recipe <id> [--json]`**: Returns recipe metadata, tags, lineage, config, metrics.

- **`mlspec show evidence <experiment> [--json]`**: Returns all evidence stages with explicit smoke/validation/final keys. Missing stages have `exists: false` with null fields.

- **JSON mode contract**: When `--json` is passed, stdout contains ONLY valid JSON. Errors return `{ "error": "..." }` on stdout with non-zero exit. No spinners, banners, or extra logs may appear on stdout in JSON mode.

- **Skill template updates**: `mlspec-next`, `mlspec-propose`, `mlspec-run`, `mlspec-resolve`, `mlspec-explore` updated to prefer JSON CLI output with fallback to file inspection.

- **Tests**: Comprehensive tests for all JSON commands, error cases, backward compatibility.

## Capabilities

### New Capabilities

- `mlspec-json-output`: Machine-readable JSON output for MLSpec CLI commands (`next`, `status`, `show recipe`, `show evidence`)

### Modified Capabilities

- `mlspec-workflow-skills`: MLSpec skill templates (`mlspec-next`, `mlspec-propose`, `mlspec-run`, `mlspec-resolve`, `mlspec-explore`) will be updated to use JSON CLI commands as primary state source

## Impact

- **CLI**: New `--json` flags on existing commands; `status --experiment` requires `--json`
- **Skill Templates**: `src/core/templates/workflows/mlspec-*.ts` updated to use JSON commands
- **Generated Skills**: All MLSpec skills regenerated after template updates
- **Tests**: New test file `test/mlspec/json-output.test.ts` and integration tests

## Out of Scope

- Evidence mutation lifecycle (`--overwrite`, `--append-run`)
- Recipe metrics setter command
- Schema or file format changes
- Human-readable experiment status output (use `--json` only)
