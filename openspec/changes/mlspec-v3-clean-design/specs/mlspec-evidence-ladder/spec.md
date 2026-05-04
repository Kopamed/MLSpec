# mlspec-evidence-ladder Specification

## ADDED Requirements

### Requirement: Evidence ladder defines experiment structure

The system SHALL support user-defined evidence ladders in protocol.md that replace hard-coded smoke/validation/final stages.

#### Scenario: Evidence ladder structure
- **WHEN** `protocol.md` contains `evidence_ladder`
- **THEN** each rung SHALL have:
  - `id: <string>` - unique rung identifier (e.g., "pilot", "validation")
  - `purpose: <string>` - human-readable purpose description
  - `budget: { model_params, training_tokens, eval_tokens, max_wall_time_hours }`
  - `arms: { baseline_arm, treatment_arm }`
  - `benchmark: { dataset, metrics }`
  - `comparison: { comparison_required, comparison_metric, comparison_direction, success_threshold }`
  - `abort_criteria: [ { metric, condition, threshold } ]`
  - `can_resolve: <boolean>`

#### Scenario: Rung IDs are user-defined
- **WHEN** evidence ladder contains rungs
- **THEN** rung IDs SHALL NOT be validated against any enum
- **AND** rung IDs SHALL be used for file naming: `evidence/<rung-id>.md`

### Requirement: Arms define baseline and treatment

Each evidence rung SHALL define both a baseline_arm and treatment_arm.

#### Scenario: Baseline arm structure
- **WHEN** a rung defines `baseline_arm`
- **THEN** it SHALL contain:
  - `id: "baseline"` (always)
  - `recipe_ref: <string> | null` - existing recipe or null for new
  - `config_overrides: <object>` - overrides to apply
  - `train_from_scratch: <boolean>`

#### Scenario: Treatment arm structure
- **WHEN** a rung defines `treatment_arm`
- **THEN** it SHALL contain:
  - `id: "treatment"` (always)
  - `recipe_ref: <string>` - base recipe ID
  - `config_overrides: <object>` - intervention applied here

### Requirement: Per-rung baseline requirements

The system SHALL support per-rung baseline requirements for experiments where baseline model differs across rungs.

#### Scenario: Baseline requirements structure
- **WHEN** `protocol.md` contains `baseline_requirements`
- **THEN** it SHALL be a map of rung-id to baseline config:
  - `required: <boolean>`
  - `recipe_ref: <string> | null`
  - `train_from_scratch: <boolean>`
  - `required_config_match: { model_params, training_tokens, config_hash }`

#### Scenario: Baseline availability tracked per rung
- **WHEN** `prepare.md` is created
- **THEN** `baseline_availability` SHALL list availability per rung:
  - `available: <boolean>`
  - `source: "existing" | "will_train" | "unavailable"`
  - `recipe_ref: <string> | null`

### Requirement: Comparison required when specified

The system SHALL enforce comparison requirements per rung.

#### Scenario: Comparison required rung
- **WHEN** a rung has `comparison.comparison_required: true`
- **THEN** evidence file SHALL include comparison between baseline_arm and treatment_arm
- **AND** comparison_metric SHALL be computed

#### Scenario: Comparison not required rung
- **WHEN** a rung has `comparison.comparison_required: false`
- **THEN** evidence file MAY omit comparison
