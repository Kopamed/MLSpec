## ADDED Requirements

### Requirement: Experiment Type Classification
The ml-experiment schema SHALL require experiment.md to include an Experiment Type classification that determines the structure and expectations for the experiment.

#### Scenario: Baseline Establishment experiment
- **WHEN** Experiment Type is "Baseline Establishment"
- **THEN** experiment.md SHALL specify target/reference/acceptance thresholds without requiring a prior baseline comparison

#### Scenario: Intervention Comparison experiment
- **WHEN** Experiment Type is "Intervention Comparison"
- **THEN** experiment.md SHALL specify the baseline/comparator being compared against

#### Scenario: Ablation experiment
- **WHEN** Experiment Type is "Ablation"
- **THEN** experiment.md SHALL require a full baseline run before the ablation run

#### Scenario: Scaling Run experiment
- **WHEN** Experiment Type is "Scaling Run"
- **THEN** experiment.md SHALL specify the scale dimensions and expected scaling behavior

#### Scenario: Bug-Fix experiment
- **WHEN** Experiment Type is "Bug-Fix"
- **THEN** experiment.md SHALL reproduce the specific failure, then verify the fix

#### Scenario: Reproduction Run experiment
- **WHEN** Experiment Type is "Reproduction Run"
- **THEN** experiment.md SHALL reproduce the published result, then compare against the original

### Requirement: Phase-Structured prepare.md
The prepare.md template SHALL organize tasks into explicit phases: Infrastructure, Tiny/Smoke Run, Protocol Run, Run Readiness, and Logging.

#### Scenario: Phase headers present
- **WHEN** agent creates prepare.md for an ml-experiment change
- **THEN** the template SHALL contain headers for: ## Infrastructure, ## Phase: Tiny/Smoke Run, ## Phase: Protocol Run, ## Run Readiness, ## Logging

#### Scenario: Task verification requirements
- **WHEN** agent fills in a prepare.md task
- **THEN** the task SHALL include a file path reference, verification command, expected output, or completion condition where applicable

### Requirement: Run Readiness Checklist
The prepare.md template SHALL include a Run Readiness section that verifies prerequisites before protocol execution.

#### Scenario: Run Readiness items present
- **WHEN** agent creates prepare.md
- **THEN** Run Readiness section SHALL include checkboxes for: tokenizer existence, train data existence, validation data existence, batch size matches protocol, total steps × batch × seq_len matches target tokens, explicit full run command, checkpoint/log paths writable

### Requirement: Evidence Grade Classification
The evidence.md template SHALL require an explicit Evidence Grade that classifies the quality and completeness of the experimental evidence.

#### Scenario: Evidence Grade options
- **WHEN** agent completes evidence.md
- **THEN** Evidence Grade SHALL be one of: Smoke | Partial-Run | Full-Protocol | Failed-Run

#### Scenario: Evidence Grade definitions
- **WHEN** Evidence Grade is "Smoke"
- **THEN** the evidence SHALL only include results from < 1 epoch or sanity checks

- **WHEN** Evidence Grade is "Partial-Run"
- **THEN** the evidence SHALL include metrics from a partially executed protocol

- **WHEN** Evidence Grade is "Full-Protocol"
- **THEN** the evidence SHALL include metrics from all protocol steps completed

- **WHEN** Evidence Grade is "Failed-Run"
- **THEN** the evidence SHALL document the failure mode and any partial results obtained

### Requirement: Protocol Satisfaction Classification
The evidence.md template SHALL require a Protocol Satisfaction classification indicating the degree to which the actual run matched the planned protocol.

#### Scenario: Protocol Satisfaction options
- **WHEN** agent completes evidence.md
- **THEN** Protocol Satisfaction SHALL be one of: Satisfies Protocol | Deviates From Protocol | Does Not Satisfy Protocol

### Requirement: Evidence Contains Only Actual Run Data
The evidence.md template instructions SHALL state that planned future runs MUST NOT be counted as evidence. Evidence SHALL only include actual commands, outputs, metrics, artifacts, and deviations.

#### Scenario: Evidence contains only past runs
- **WHEN** agent prepares evidence.md
- **THEN** the evidence SHALL only reference commands that have been executed, metrics that have been observed, and artifacts that have been produced

### Requirement: Resolution Decision-Grade Evidence
The resolution.md template SHALL require a Decision-Grade Evidence field indicating whether the evidence is sufficient to support a definitive decision.

#### Scenario: Decision-Grade Evidence required
- **WHEN** agent completes resolution.md
- **THEN** Decision-Grade Evidence SHALL be one of: Yes | No

#### Scenario: Decision-Grade Evidence definitions
- **WHEN** Decision-Grade Evidence is "Yes"
- **THEN** the evidence SHALL be sufficient to support a definitive Accepted or Rejected decision

- **WHEN** Decision-Grade Evidence is "No"
- **THEN** the decision SHALL be Inconclusive, Invalid, or Needs-Rerun

### Requirement: Evidence Grade Gates for Resolution
The schema instructions SHALL enforce that Smoke/Partial-Run evidence cannot support an Accepted or Rejected resolution. Full-Protocol evidence is required for Accepted/Rejected.

#### Scenario: Smoke evidence requires inconclusive
- **WHEN** Evidence Grade is "Smoke"
- **THEN** resolution.md Decision SHALL only be: Inconclusive | Invalid | Needs-Rerun

#### Scenario: Partial-Run evidence requires inconclusive
- **WHEN** Evidence Grade is "Partial-Run"
- **THEN** resolution.md Decision SHALL only be: Inconclusive | Invalid | Needs-Rerun

#### Scenario: Full-Protocol evidence required for Accepted/Rejected
- **WHEN** resolution.md Decision is "Accepted" or "Rejected"
- **THEN** Evidence Grade SHALL be "Full-Protocol" AND Protocol Satisfaction SHALL be "Satisfies Protocol"

#### Scenario: Failed-Run evidence requires invalid or needs-rerun
- **WHEN** Evidence Grade is "Failed-Run"
- **THEN** resolution.md Decision SHALL only be: Invalid | Needs-Rerun

### Requirement: Protocol Deviation Recording
The evidence.md template SHALL include a Protocol Deviations section for recording any changes from the planned protocol.

#### Scenario: Protocol deviations documented
- **WHEN** the actual run deviates from protocol.md
- **THEN** evidence.md SHALL record: what changed, why it changed, and the impact on validity

### Requirement: Implementation Issue Recording
The evidence.md template SHALL include an Implementation Issues section for bugs, data issues, or infrastructure problems discovered during the run.

#### Scenario: Implementation issues documented
- **WHEN** agent identifies implementation issues during the run
- **THEN** evidence.md SHALL record the issues found and their impact on the experiment validity

### Requirement: Claims Invalidated Recording
The evidence.md template SHALL include a Claims Invalidated section for recording any hypothesis claims that were invalidated during the run.

#### Scenario: Invalidated claims documented
- **WHEN** the run invalidates any hypothesis or claim from experiment.md
- **THEN** evidence.md SHALL record which claims were invalidated and the supporting evidence
