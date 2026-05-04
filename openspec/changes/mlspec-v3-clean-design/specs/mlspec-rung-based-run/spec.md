# mlspec-rung-based-run Specification

## ADDED Requirements

### Requirement: CLI validates rung-based evidence gating

The system SHALL validate that evidence can be written for a rung before allowing the agent to proceed.

`mlspec run <experiment> <rung>` is a preflight gate checker. It does NOT train models, write evidence, or invoke skills. It only validates that the rung is runnable.

#### Scenario: CLI validates prepare gate
- **WHEN** agent writes evidence/<rung>.md
- **THEN** CLI SHALL validate prepare.md exists with status=ready when agent runs validation
- **AND** CLI SHALL error if prepare is missing or status!=ready

#### Scenario: CLI validates rung exists
- **WHEN** agent writes evidence/<rung>.md
- **THEN** CLI SHALL validate rung exists in protocol.evidence_ladder
- **AND** CLI SHALL error if rung not found

#### Scenario: CLI validates evidence schema
- **WHEN** agent writes evidence/<rung>.md
- **THEN** CLI SHALL validate schema when agent runs mlspec validate
- **AND** CLI SHALL error if schema is invalid

### Requirement: mlspec-run skill instructs agent

The mlspec-run skill is an agent prompt that instructs the agent to perform evidence collection.

#### Scenario: Agent reads skill and performs evidence collection
- **WHEN** agent invokes /mlspec-run skill
- **THEN** skill instructs agent to perform:
  1. Train baseline_arm if required (or use existing recipe)
  2. Train treatment_arm
  3. Run benchmark on both arms
  4. Compute comparison metrics
  5. Write evidence/<rung>.md with results
  6. Run `mlspec validate` to verify schema

#### Scenario: Skill instructs evidence structure
- **WHEN** agent writes evidence/<rung>.md
- **THEN** skill SHALL instruct the file contain:
  - `entity_type: evidence`
  - `schema: ml-experiment-v3`
  - `experiment_id: <string>`
  - `rung: <string>` (rung ID, not stage)
  - `budget: { model_params, training_tokens }`
  - `baseline_arm: { recipe_ref, runs: [ { seed, command, completed, duration_minutes, metrics } ] }`
  - `treatment_arm: { recipe_ref, runs: [ { seed, command, completed, duration_minutes, metrics } ] }`
  - `aggregate: { baseline: { <metric>: { mean, std } }, treatment: { <metric>: { mean, std } } }`
  - `comparison: { comparison_metric, baseline_value, treatment_value, delta, delta_percent, success } | null` (nullable; required when rung.comparison.comparison_required=true)
  - `abort_criteria_evaluation: [ { criterion, metric, condition, threshold, triggered, actual_value } ]`

### Requirement: Evidence file path is rung-based

The system SHALL use `evidence/<rung-id>.md` paths instead of `evidence/<stage>.md`.

#### Scenario: Rung-based file naming
- **WHEN** evidence is recorded for rung "pilot"
- **THEN** file path SHALL be `evidence/pilot.md`
- **AND** file path SHALL NOT be `evidence/smoke.md`

### Requirement: Skills update state, CLI validates consistency

The system SHALL separate state mutation from state validation.

#### Scenario: Skill updates experiment status to running
- **WHEN** agent writes first evidence/<rung>.md for a draft experiment
- **THEN** skill SHALL update experiment.yaml status to running
- **AND** `mlspec validate` verifies status is consistent with artifacts

### Requirement: CLI validates evidence schema

The system SHALL validate evidence files against schema.

#### Scenario: Validate checks ladder consistency
- **WHEN** `mlspec validate` runs
- **THEN** it SHALL verify evidence files exist only for rungs in protocol
- **AND** it SHALL error if evidence exists for rung not in protocol
