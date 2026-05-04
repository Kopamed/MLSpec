# mlspec-separated-resolution Specification

## ADDED Requirements

### Requirement: CLI validates resolution gating

The system SHALL validate that resolution can proceed before allowing the agent to write resolution.md.

`mlspec resolve <experiment>` is a preflight gate checker. It does NOT assess outcomes, write resolution.md, or invoke skills. It only validates that resolution is allowed.

#### Scenario: CLI validates can_resolve gate
- **WHEN** agent writes resolution.md
- **THEN** CLI SHALL validate that a rung with can_resolve=true has evidence
- **AND** CLI SHALL error if no resolvable evidence exists

#### Scenario: CLI validates no existing resolution
- **WHEN** `mlspec resolve <experiment>` runs
- **THEN** it SHALL error if resolution.md already exists
- **AFTER** agent writes resolution.md, `mlspec validate` SHALL validate schema and state consistency

### Requirement: mlspec-resolve skill instructs agent

The mlspec-resolve skill is an agent prompt that instructs the agent to perform outcome assessment.

#### Scenario: Agent reads skill and assesses outcomes
- **WHEN** agent invokes /mlspec-resolve skill
- **THEN** skill instructs agent to:
  1. Read evidence from can_resolve=true rung
  2. Assess mechanistic_outcome (success|failure|inconclusive)
  3. Assess practical_outcome (positive|negative|inconclusive|variant_accepted)
  4. Write resolution.md with separated outcomes
  5. Update experiment.yaml status to resolved
  6. Run `mlspec validate` to verify consistency

#### Scenario: Skill instructs resolution structure
- **WHEN** agent writes resolution.md
- **THEN** skill SHALL instruct the file contain:
  - `entity_type: resolution`
  - `schema: ml-experiment-v3`
  - `experiment_id: <string>`
  - `resolution: accept | reject | hold | retry`
  - `mechanistic_outcome: { hypothesis, result: success|failure|inconclusive, evidence_ref, notes }`
  - `practical_outcome: { hypothesis, result: positive|negative|inconclusive|variant_accepted, evidence_ref, notes }`
  - `decision_rationale: <string>`
  - `supporting_evidence: [ { rung, comparison_metric, baseline_value, treatment_value, delta } ]`

### Requirement: Variant accepted case

The system SHALL support accepting experiments where mechanistic hypothesis fails but practical utility succeeds.

#### Scenario: Variant accepted decision
- **WHEN** mechanistic_outcome.result is failure
- **AND** practical_outcome.result is positive
- **THEN** agent SHALL set practical_outcome.result: variant_accepted
- **AND** agent MAY set resolution: accept
- **AND** agent SHALL explain divergence in decision_rationale
