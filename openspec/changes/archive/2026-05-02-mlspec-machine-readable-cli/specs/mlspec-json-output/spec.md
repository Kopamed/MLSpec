# mlspec-json-output Specification

## Purpose

This capability provides machine-readable JSON output for MLSpec CLI commands, enabling reliable structured state access for generated skills and external automation.

## ADDED Requirements

### Requirement: mlspec next --json returns structured recommendations

The `mlspec next --json` command SHALL return a JSON object containing workspace state and prioritized next-action recommendations.

#### Scenario: next --json with pending actions
- **WHEN** user runs `mlspec next --json` with experiments requiring action
- **THEN** the output SHALL be a valid JSON object with `workspace_state` and `actions` fields
- **AND** `workspace_state` SHALL contain `recipes_count`, `experiments_count`, `current_best_recipes`, and `current_best_recipe`
- **AND** `actions` SHALL be a non-empty array of action objects sorted by ascending `priority`
- **AND** each action SHALL contain `priority` (number), `action_type` (string), `suggested_command` (string), `reason` (string), and optional `target` object

#### Scenario: next --json with no actions
- **WHEN** user runs `mlspec next --json` with no pending actions
- **THEN** the output SHALL have an empty `actions` array
- **AND** exit code SHALL be 0

#### Scenario: next --json in bootstrap state (empty workspace)
- **WHEN** user runs `mlspec next --json` with no recipes or experiments
- **THEN** `workspace_state.recipes_count` SHALL be 0
- **AND** `workspace_state.experiments_count` SHALL be 0
- **AND** `workspace_state.current_best_recipes` SHALL be empty
- **AND** `workspace_state.current_best_recipe` SHALL be null
- **AND** `actions` SHALL contain recommendation with `action_type: 'bootstrap'`

#### Scenario: next --json error case
- **WHEN** user runs `mlspec next --json` but workspace does not exist
- **THEN** stdout SHALL contain only valid JSON with `error` field
- **AND** exit code SHALL be non-zero

#### Scenario: next --json action_type values
- **WHEN** user runs `mlspec next --json`
- **THEN** each action's `action_type` SHALL be one of: `explore`, `propose`, `run`, `resolve`, `bootstrap`, `none`

---

### Requirement: mlspec status --json returns workspace summary

The `mlspec status [--json]` command SHALL return a JSON object containing workspace summary information.

#### Scenario: status --json returns recipe and experiment summary
- **WHEN** user runs `mlspec status --json`
- **THEN** the output SHALL be a valid JSON object
- **AND** SHALL contain `recipes` array with id, tags, and has_metrics for each recipe
- **AND** SHALL contain `experiments` object with `total`, `by_status` (draft, running, resolved arrays)
- **AND** SHALL contain `current_best_recipes` (string array of all recipes with 'current-best' tag)
- **AND** SHALL contain `current_best_recipe` (string or null; null if zero or multiple current-best recipes exist)
- **AND** SHALL contain `warnings` and `errors` arrays

#### Scenario: status --json backward compatibility
- **WHEN** user runs `mlspec status` without --json
- **THEN** the output SHALL remain human-readable markdown
- **AND** SHALL match existing output format

---

### Requirement: mlspec status --experiment <id> --json returns experiment state

The `mlspec status --experiment <id> --json` command SHALL return structured experiment state. This command requires `--json` flag.

#### Scenario: status --experiment --json with existing experiment
- **WHEN** user runs `mlspec status --experiment <experiment-id> --json`
- **AND** the experiment exists
- **THEN** the output SHALL be a valid JSON object
- **AND** SHALL contain `experiment_id`, `status`, `base_recipe`, `proposed_recipe`
- **AND** SHALL contain `evidence_stages` object with explicit keys: `smoke`, `validation`, `final`
- **AND** each stage SHALL contain `exists` (boolean), `path` (string or null), `recommendation` (string or null)
- **AND** SHALL contain `missing_stages` array (subset of ['smoke', 'validation', 'final'])
- **AND** SHALL contain `has_recommendation` (boolean)
- **AND** SHALL contain `ready_to_resolve` (boolean)

#### Scenario: ready_to_resolve definition
- **WHEN** `ready_to_resolve` is computed for an experiment
- **THEN** it SHALL be `true` when: experiment status is not 'resolved' AND at least one evidence stage has a non-null recommendation
- **AND** it SHALL be `false` otherwise

#### Scenario: status --experiment --json with non-existent experiment
- **WHEN** user runs `mlspec status --experiment nonexistent --json`
- **THEN** stdout SHALL contain only valid JSON with `error` field
- **AND** exit code SHALL be non-zero

#### Scenario: status --experiment without --json is an error
- **WHEN** user runs `mlspec status --experiment <id>` without --json
- **THEN** stdout SHALL contain only valid JSON with `error` field
- **AND** stderr MAY contain diagnostic info
- **AND** exit code SHALL be non-zero

---

### Requirement: mlspec show recipe <id> --json returns recipe metadata

The `mlspec show recipe <id> [--json]` command SHALL return structured recipe metadata.

#### Scenario: show recipe --json with existing recipe
- **WHEN** user runs `mlspec show recipe <recipe-id> --json`
- **AND** the recipe exists
- **THEN** the output SHALL be a valid JSON object
- **AND** SHALL contain all RecipeMetadata fields: `id`, `name`, `tags`, `parent_recipe`, `created_by_experiment`, `config`, `metrics`, `created`
- **AND** `summary_path` SHALL be present if summary.md exists

#### Scenario: show recipe --json backward compatibility
- **WHEN** user runs `mlspec show recipe <id>` without --json
- **THEN** the output SHALL remain human-readable markdown

#### Scenario: show recipe --json with non-existent recipe
- **WHEN** user runs `mlspec show recipe nonexistent --json`
- **THEN** stdout SHALL contain only valid JSON with `error` field
- **AND** exit code SHALL be non-zero

---

### Requirement: mlspec show evidence <experiment> --json returns evidence stages

The `mlspec show evidence <experiment> [--json]` command SHALL return structured evidence data with explicit stage keys.

#### Scenario: show evidence --json always includes all three stages
- **WHEN** user runs `mlspec show evidence <experiment-id> --json`
- **THEN** the `stages` object SHALL always contain explicit keys: `smoke`, `validation`, `final`
- **AND** each stage SHALL contain `exists` (boolean), `path` (string or null), `runs` (array or null), `aggregate` (object or null), `summary` (string or null), `recommendation` (string or null)

#### Scenario: show evidence --json with evidence present
- **WHEN** user runs `mlspec show evidence <experiment-id> --json`
- **AND** evidence exists for some stages
- **THEN** existing stages SHALL have `exists: true` with populated `runs`, `aggregate`, `summary`, `recommendation`
- **AND** missing stages SHALL have `exists: false` with `null` for all other fields

#### Scenario: show evidence --json backward compatibility
- **WHEN** user runs `mlspec show evidence <experiment>` without --json
- **THEN** the output SHALL remain human-readable markdown

#### Scenario: show evidence --json with non-existent experiment
- **WHEN** user runs `mlspec show evidence nonexistent --json`
- **THEN** stdout SHALL contain only valid JSON with `error` field
- **AND** exit code SHALL be non-zero

---

### Requirement: JSON output format conventions

All MLSpec JSON output commands SHALL follow consistent format conventions.

#### Scenario: JSON output uses pretty-print formatting
- **WHEN** any MLSpec command outputs JSON
- **THEN** the JSON SHALL be pretty-printed with 2-space indentation

#### Scenario: JSON output error format
- **WHEN** a JSON command encounters an error
- **THEN** stdout SHALL contain only valid JSON with `error` field
- **AND** exit code SHALL be non-zero
- **AND** stderr MAY contain additional diagnostic info

#### Scenario: JSON mode stdout is clean
- **WHEN** any MLSpec command is run with `--json` flag
- **THEN** stdout SHALL contain only valid JSON
- **AND** no spinners, banners, checkmarks, markdown, or extra logs SHALL appear on stdout

#### Scenario: JSON output is valid parseable JSON
- **WHEN** any MLSpec command outputs JSON
- **THEN** the output SHALL be valid JSON that can be parsed by `JSON.parse()`
