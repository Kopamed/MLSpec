# mlspec-prepare-stage Specification

## ADDED Requirements

### Requirement: mlspec prepare CLI validates prepare.md

The system SHALL provide `mlspec prepare <experiment>` CLI command that validates prepare.md artifact.

#### Scenario: Prepare command validates artifact
- **WHEN** `mlspec prepare <experiment>` runs
- **THEN** CLI SHALL validate prepare.md exists
- **AND** CLI SHALL validate prepare.md schema is correct
- **AND** CLI SHALL return exit code based on prepare.md status field:
  - 0 if status=ready
  - 1 if status=needs_work
  - 2 if status=protocol_change_required

### Requirement: mlspec-prepare skill instructs agent

The mlspec-prepare skill is an agent prompt that instructs the agent to perform engineering readiness verification.

#### Scenario: Agent reads skill and performs checks
- **WHEN** agent invokes /mlspec-prepare skill
- **THEN** skill instructs agent to perform:
  1. Transform implementation check (if data_intervention exists)
  2. Benchmark scripts check
  3. Training startup check (≤100 steps)
  4. Baseline availability check per rung
- **AND** skill instructs agent to write prepare.md with verification results

#### Scenario: Skill defines check boundaries
- **WHEN** agent runs prepare checks
- **THEN** skill SHALL instruct: at most 100 steps for training startup
- **AND** skill SHALL NOT instruct: full model training or expensive comparisons

### Requirement: Agent creates prepare.md artifact

The agent SHALL write prepare.md after performing readiness checks.

#### Scenario: prepare.md structure
- **WHEN** agent completes prepare checks
- **THEN** agent SHALL write prepare.md containing:
  - `entity_type: prepare`
  - `schema: ml-experiment-v3`
  - `experiment_id: <string>`
  - `status: ready | needs_work | protocol_change_required`
  - `completed: <timestamp>`
  - `checks: [ { id, name, status, notes } ]`
  - `baseline_availability: { <rung-id>: { available, source, recipe_ref, notes } }`

#### Scenario: prepare.md with blocking issues
- **WHEN** checks reveal fixable engineering issues
- **THEN** agent SHALL set `status: needs_work`
- **AND** agent SHALL add `blocking_issues: [ { type, location, description, can_fix_in_prepare, suggested_fix } ]`

#### Scenario: prepare.md with protocol issues
- **WHEN** checks reveal semantic mismatches (intervention/benchmark/metric/data semantics changed)
- **THEN** agent SHALL set `status: protocol_change_required`
- **AND** agent SHALL add `protocol_issues: [ { type, description, recommendation } ]`

### Requirement: Prepare gates evidence collection

The system SHALL prevent evidence collection until Prepare passes.

#### Scenario: Run blocked without prepare
- **WHEN** agent attempts to write evidence/<rung>.md
- **AND** prepare.md does not exist or status!=ready
- **THEN** CLI SHALL error when agent runs validation commands

#### Scenario: Agent verifies prepare before evidence
- **WHEN** agent invokes /mlspec-run skill
- **THEN** skill SHALL instruct agent to verify prepare.md status=ready before writing evidence
