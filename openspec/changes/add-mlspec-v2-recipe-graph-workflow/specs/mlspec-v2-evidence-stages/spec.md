# mlspec-v2-evidence-stages Specification

## ADDED Requirements

### Requirement: Evidence Stage Semantics

The system SHALL use three semantic evidence stages:

- `smoke`: Cheap signal check. Questions: Does it run? Is there obvious positive/negative signal?
- `validation`: Trusted local evaluation. Questions: Does it beat the base recipe under the project's real validation setup?
- `final`: Final external/submission/production result. Questions: What happened when this recipe was used for real?

#### Scenario: Smoke stage evidence
- **WHEN** user adds smoke evidence for experiment
- **THEN** system creates/updates `mlspec/experiments/<id>/evidence/smoke.md`
- **AND** file contains runs at reduced scale (e.g., 50% data, 1 seed)

#### Scenario: Validation stage evidence
- **WHEN** user adds validation evidence for experiment
- **THEN** system creates/updates `mlspec/experiments/<id>/evidence/validation.md`
- **AND** file contains runs at full scale (full data, multiple seeds)

#### Scenario: Final stage evidence
- **WHEN** user adds final evidence for experiment
- **THEN** system creates/updates `mlspec/experiments/<id>/evidence/final.md`
- **AND** file contains external/submission/production results

---

### Requirement: Evidence File Structure

Evidence files SHALL contain:

- YAML frontmatter with `entity_type`, `experiment_id`, `stage`, `created`
- `runs[]`: array of individual run results
- `aggregate{}`: aggregated statistics across runs
- `summary`: human-readable summary
- `recommendation`: suggested next action

#### Scenario: Evidence file frontmatter
- **WHEN** evidence file is created
- **THEN** YAML frontmatter SHALL contain:
  ```yaml
  entity_type: evidence
  experiment_id: <experiment-id>
  stage: smoke|validation|final
  created: <ISO timestamp>
  ```

#### Scenario: Multiple runs aggregated
- **WHEN** validation evidence has multiple seeds (42, 43, 44)
- **THEN** `runs` array SHALL contain entry for each seed
- **AND** `aggregate` SHALL contain mean and std for each metric

---

### Requirement: Evidence Runs Structure

Each run in `runs[]` SHALL contain:

- `seed`: random seed used
- `command`: actual command executed
- `completed`: ISO timestamp
- `duration_minutes`: execution time
- `metrics`: key-value pairs of metric values

#### Scenario: Single run evidence
- **WHEN** smoke evidence is recorded with 1 seed
- **THEN** `runs` array has single entry with seed, command, metrics
- **AND** `aggregate` has mean = single value, std = null

#### Scenario: Multi-seed evidence
- **WHEN** validation evidence is recorded with 3 seeds
- **THEN** `runs` array has 3 entries
- **AND** `aggregate.accuracy.mean` is mean across 3 runs
- **AND** `aggregate.accuracy.std` is standard deviation

---

### Requirement: Add Evidence Command

The system SHALL provide `mlspec add-evidence` command for recording evidence.

#### Scenario: Add evidence with stage
- **WHEN** user runs `mlspec add-evidence add-roi-cropping --stage smoke`
- **THEN** system creates/updates `mlspec/experiments/add-roi-cropping/evidence/smoke.md`
- **AND** prompts for or accepts metrics data

#### Scenario: Add evidence with metrics
- **WHEN** user runs `mlspec add-evidence add-roi-cropping --stage validation --metrics '{"accuracy": 0.934}'`
- **THEN** evidence file SHALL contain metrics in current run's `metrics` field

#### Scenario: Add evidence with seed
- **WHEN** user runs `mlspec add-evidence add-roi-cropping --stage validation --seed 42`
- **THEN** new run entry SHALL have `seed: 42`

---

### Requirement: Evidence Not Required to Progress Sequentially

Experiments SHALL NOT be required to have evidence in sequential stages.

#### Scenario: Jump to validation
- **WHEN** experiment has smoke evidence but skips to validation
- **THEN** system SHALL allow this
- **AND** warn if stage ordering seems suspicious

#### Scenario: Final without validation
- **WHEN** experiment has only final evidence (no validation)
- **THEN** system SHALL allow this
- **AND** warn "Final evidence without validation may be unreliable"

---

### Requirement: Show Evidence Command

The system SHALL provide `mlspec show evidence` command to display evidence summary.

#### Scenario: Show evidence for experiment
- **WHEN** user runs `mlspec show evidence add-roi-cropping`
- **THEN** system SHALL display summary of all evidence files
- **AND** show runs, aggregate metrics, and recommendations for each stage
