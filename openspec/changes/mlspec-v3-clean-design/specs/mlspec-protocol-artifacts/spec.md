# mlspec-protocol-artifacts Specification

## ADDED Requirements

### Requirement: Protocol artifact defines experiment structure

The system SHALL provide protocol.md artifact for each experiment that defines the evidence ladder, compute agreement, and baseline requirements.

#### Scenario: Protocol schema structure
- **WHEN** `protocol.md` is created for an experiment
- **THEN** it SHALL contain:
  - `entity_type: protocol`
  - `schema: ml-experiment-v3`
  - `experiment_id: <string>`
  - `compute_agreement: { cpu_cores, gpu_devices, gpu_memory_gb, wall_time_max_hours, token_budget }`
  - `evidence_ladder: [ { id, purpose, budget, arms, benchmark, comparison, abort_criteria, can_resolve } ]`
  - `baseline_requirements: { <rung-id>: { required, recipe_ref, train_from_scratch, required_config_match } }`

#### Scenario: Protocol validates required fields
- **WHEN** `mlspec validate` runs on an experiment
- **THEN** it SHALL error if `protocol.md` is missing
- **AND** it SHALL error if `compute_agreement` is missing
- **AND** it SHALL error if `evidence_ladder` is empty or missing

### Requirement: Prepare artifact records engineering verification

The system SHALL provide prepare.md artifact that records engineering readiness verification before evidence collection.

#### Scenario: Prepare schema structure
- **WHEN** `prepare.md` is created for an experiment
- **THEN** it SHALL contain:
  - `entity_type: prepare`
  - `schema: ml-experiment-v3`
  - `experiment_id: <string>`
  - `status: ready | needs_work | protocol_change_required`
  - `completed: <timestamp>`
  - `checks: [ { id, name, status, notes } ]`
  - Optional `blocking_issues: [ { type, location, description, can_fix_in_prepare, suggested_fix } ]`
  - Optional `protocol_issues: [ { type, description, recommendation } ]`
  - `baseline_availability: { <rung-id>: { available, source, recipe_ref, notes } }`

#### Scenario: Prepare required before evidence
- **WHEN** `mlspec run <experiment> <rung>` executes
- **THEN** it SHALL error if `prepare.md` does not exist
- **AND** it SHALL error if `prepare.md` has `status != ready`

### Requirement: Protocol and prepare artifacts use ml-experiment-v3 schema

The system SHALL use `schema: ml-experiment-v3` in protocol.md and prepare.md artifacts.

#### Scenario: Protocol uses v3 schema
- **WHEN** `protocol.md` is parsed
- **THEN** `schema` field SHALL equal `ml-experiment-v3`

#### Scenario: Prepare uses v3 schema
- **WHEN** `prepare.md` is parsed
- **THEN** `schema` field SHALL equal `ml-experiment-v3`
