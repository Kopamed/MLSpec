## ADDED Requirements

### Requirement: Audit runs invariant checks

The system SHALL support `mlspec audit --case <id>` which executes all invariant checks and returns a machine-readable report. Audit checks SHALL be deterministic and repeatable.

The audit report SHALL include: `ok` (true if no failures), `severity` (pass | warning | fail), `checks[]` with each check's `id`, `description`, `result`, and any `details`.

Audit SHALL run automatically at: (1) `run end`, (2) `evidence classify`, (3) `decision issue`. It can also be called explicitly.

#### Scenario: Audit passes with no issues
- **WHEN** `mlspec audit --case <id>` is called on a well-formed case with decision_grade evidence
- **THEN** the system SHALL return `ok: true`, `severity: pass`
- **AND** `checks` SHALL contain all invariant checks with `result: pass`

#### Scenario: Audit fails with invariant violations
- **WHEN** `mlspec audit --case <id>` is called on a case where a Decision cites Evidence grade `partial`
- **THEN** the system SHALL return `ok: false`, `severity: fail`
- **AND** `checks` SHALL include `UNSUPPORTED_DECISION` with `result: fail`
- **AND** `details` SHALL identify the Decision and Evidence grades

### Requirement: Audit checks catch planned-run-as-evidence

The system SHALL have an invariant check `PLANNED_RUN_NOT_EVIDENCE` that detects when any Evidence or Decision cites a Run whose status is `planned` or `running`.

This catches the agent failure mode where a run is planned but not yet executed, yet its results are already being cited as support.

#### Scenario: Catch planned run cited as evidence
- **WHEN** an agent creates Evidence citing a Run with `status: planned`
- **THEN** the system SHALL reject the Evidence creation with `code: PLANNED_RUN_NOT_EVIDENCE`
- **AND** the Audit check `PLANNED_RUN_NOT_EVIDENCE` SHALL fail

### Requirement: Audit checks catch cherry-picking

The system SHALL have an invariant check `CHERRY_PICK_DETECTED` that groups sibling runs (same Protocol, same Snapshot family, same comparator) and detects when a Claim cites only a favorable subset without a declared `selection_rule`.

If multiple sibling Runs exist and only the best-performing subset is cited, this is cherry-picking unless an explicit selection criterion was declared before the runs were executed.

#### Scenario: Detect cherry-pick from siblings
- **WHEN** 5 sibling Runs exist for a Protocol, with metric values [0.89, 0.91, 0.92, 0.93, 0.94]
- **AND** a Claim cites only the Run with 0.94 without a `selection_rule`
- **THEN** `CHERRY_PICK_DETECTED` SHALL fail
- **AND** `suggested_next_actions` SHALL include "cite all sibling runs or declare selection_rule before running"

### Requirement: Audit checks catch underpowered run promoted to decision_grade

The system SHALL have an invariant check `RESOURCE_UNDERRUN` that detects when a Run is marked `kind: full` but its `actual_resources` fall below Protocol's `required_resources` on any dimension.

#### Scenario: Catch underpowered full run
- **WHEN** a Run has `kind: full` but `actual_resources.gpu_hours` is 2.1 against a Protocol requiring 12.0
- **THEN** `RESOURCE_UNDERRUN` SHALL fail
- **AND** Evidence grade SHALL be capped at `proxy` or lower

### Requirement: Audit checks catch failed run cited as success

The system SHALL have an invariant check `RUN_STATUS_MISMATCH` that detects when a Run with `status: failed` or `status: aborted` is cited by Evidence with a positive grade, or when a Decision with `status: accept` cites such Evidence.

#### Scenario: Catch failed run cited as success
- **WHEN** Evidence cites a Run with `status: failed`
- **THEN** `RUN_STATUS_MISMATCH` SHALL fail
- **AND** return `code: RUN_STATUS_INVALID_FOR_EVIDENCE`

### Requirement: Audit checks catch baseline comparability failures

The system SHALL have an invariant check `BASELINE_NOT_COMPARABLE` that verifies that for any comparative Claim, the baseline Run shares the same: `split_manifest_digest`, `evaluator_digest`, and `metric_spec`.

If any differ, the comparison is invalid even if the metric names match.

#### Scenario: Detect incomparable baseline
- **WHEN** a Run's `split_manifest_digest` is `abc123` but the baseline's is `def456`
- **AND** a Claim cites both for a comparative claim
- **THEN** `BASELINE_NOT_COMPARABLE` SHALL fail
- **AND** `blocking_invariants` SHALL include `BASELINE_SPLIT_MISMATCH`

### Requirement: Audit checks catch snapshot contamination

The system SHALL have an invariant check `SNAPSHOT_CONTAMINATION` that detects when a Run's outputs are cited but the current workspace's `commit_hash` or `config_digests` differ from the Run's Snapshot.

This catches the case where code is edited after a run completes, and someone mistakenly treats the current workspace as the run's context.

#### Scenario: Detect snapshot contamination
- **WHEN** an Evidence cites a Run with Snapshot `snap_01`
- **AND** the current workspace commit is different from `snap_01.commit_hash`
- **THEN** `SNAPSHOT_CONTAMINATION` SHALL emit a warning
- **AND** in strict mode (when this evidence is cited for a decision) it SHALL fail
- **AND** the Evidence grade SHALL be capped unless the new context is explicitly snapshotted

### Requirement: Audit checks catch missing snapshot for evidence-bearing run

The system SHALL have an invariant check `SNAPSHOT_REQUIRED` that fails when a Run with `kind: full` or `kind: replication` has no Snapshot.

#### Scenario: Detect missing snapshot
- **WHEN** a Run has `kind: full` and no `snapshot_id`
- **THEN** `SNAPSHOT_REQUIRED` SHALL fail
- **AND** return `code: SNAPSHOT_REQUIRED`

### Requirement: Audit checks catch orphan artifacts

The system SHALL have an invariant check `ORPHAN_ARTIFACT` that detects any Artifact that has no `produced_by_run_ref` or no digest.

An artifact without lineage is untrustworthy and cannot support decision-grade evidence.

#### Scenario: Detect orphan artifact
- **WHEN** an Artifact has no `produced_by_run_ref` or `digest` is null
- **THEN** `ORPHAN_ARTIFACT` SHALL fail
- **AND** return `code: ORPHAN_ARTIFACT`

### Requirement: Audit checks catch agent trace gaps

The system SHALL have an invariant check `AGENT_TRACE_GAP` that detects when a Decision was made by an agent but the ActionLog is missing prompt, command, or stdout/stderr references.

This catches the PROV-AGENT failure mode where agent reasoning is not traceable.

#### Scenario: Detect agent trace gap
- **WHEN** a Decision has `actor_ref` starting with `agent:`
- **AND** the associated ActionLog lacks `prompt_artifact_ref`, `command`, or `stdout/stderr_artifacts`
- **THEN** `AGENT_TRACE_GAP` SHALL fail
- **AND** return `code: AGENT_TRACE_GAP`
