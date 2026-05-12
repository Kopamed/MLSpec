## ADDED Requirements

### Requirement: Evidence grade is computed by the CLI

The system SHALL compute the Evidence grade deterministically from: (1) the ratio of actual_resources to required_resources across all ResourceBudget dimensions, (2) the Run's status, (3) the presence and resolution state of Deviations, (4) whether a Snapshot exists, (5) whether a matched baseline is available for comparative claims.

The agent SHALL NOT be able to claim an Evidence grade. The agent submits inputs; the CLI computes the grade.

#### Scenario: Compute grade from resource ratio
- **WHEN** `mlspec evidence classify --run <id>` is called with a Run whose `actual_resources` are at least 100% of Protocol's `required_resources` on all dimensions
- **AND** the Run status is `completed`
- **AND** there are no unresolved material or fatal Deviations
- **AND** a Snapshot exists
- **AND** a matched baseline is attached for comparative claims
- **THEN** the system SHALL return grade `decision_grade`

#### Scenario: Underpowered run downgrades grade
- **WHEN** `mlspec evidence classify --run <id>` is called with a Run whose `actual_resources.gpu_hours` is 30% of Protocol's `required_resources.gpu_hours`
- **THEN** the system SHALL return grade `proxy` at maximum
- **AND** `protocol_satisfied` SHALL be `partial`
- **AND** `warnings` SHALL include `RESOURCE_UNDERRUN`

#### Scenario: Missing snapshot caps grade
- **WHEN** Evidence is classified for a Run with `kind: full` that has no Snapshot
- **THEN** the system SHALL return grade `invalid`
- **AND** `blocking_invariants` SHALL include `SNAPSHOT_REQUIRED`

### Requirement: Evidence grade enum and thresholds

The system SHALL support these grades in ascending order of strength: `smoke`, `proxy`, `partial`, `decision_grade`, `replicated`, `invalid`.

Grade caps SHALL be computed as follows:

| Grade | Resource condition | Other conditions |
|---|---|---|
| `smoke` | minimum ratio < 10% across dimensions | none |
| `proxy` | minimum ratio >= 10% AND < 30% across dimensions | none |
| `partial` | minimum ratio >= 30% AND < 100% across dimensions | OR full compute but missing baseline/variance/deviation |
| `decision_grade` | minimum ratio >= 100% across ALL dimensions | matched baseline, evaluator digest match, variance reported (multiple seeds), no unresolved material/fatal deviations, snapshot exists |
| `replicated` | decision_grade conditions met | plus replication strategy satisfied |
| `invalid` | fatal deviation present | OR lineage hole (missing produced_by_run_ref) |

The minimum completeness ratio across dimensions (gpu_hours, data_fraction, epochs, seeds) determines the resource cap. A single dimension at 5% minimum ratio caps the grade at `smoke` regardless of others.

#### Scenario: Minimum ratio rule
- **WHEN** a Run has gpu_hours at 100%, data_fraction at 100%, epochs at 100%, but seeds at 1 of 5 required
- **THEN** the system SHALL cap the grade at `proxy` (seeds dimension is < 30%)
- **AND** `warnings` SHALL include `INSUFFICIENT_SEEDS`

#### Scenario: Grade measures strength, not outcome
- **WHEN** a Run meets all decision_grade conditions but the metric result is negative (claim is rejected)
- **THEN** the system SHALL return grade `decision_grade`
- **AND** the Decision MAY be `reject` if the claim is negatively supported

### Requirement: Evidence cites runs and records metrics

Evidence SHALL be created via `mlspec evidence classify`. The agent submits: `run_ids[]`, `metrics[]` ({name, split, value, dispersion?, seed?}), `baseline_run_ids[]` for comparative claims, and `deviation_ids[]`.

The system SHALL compute grade from these inputs against the Protocol's thresholds. The agent cannot override the computed grade.

#### Scenario: Create evidence with metrics
- **WHEN** `mlspec evidence classify --run <id> --metrics '[{"name":"accuracy","split":"test","value":0.923}]'`
- **THEN** the system creates an Evidence record with the metrics embedded
- **AND** computes the grade from resource ratio and deviation state
- **AND** returns the Evidence with `grade` and `protocol_satisfied` fields

#### Scenario: Comparative claim requires baseline
- **WHEN** `mlspec evidence classify --run <id> --baseline-run <baseline-id>` is called for a comparative claim
- **AND** the baseline's split, evaluator digest, or metric name differs from the Run's
- **THEN** the system SHALL return `grade: invalid`
- **AND** `blocking_invariants` SHALL include `BASELINE_NOT_COMPARABLE`
