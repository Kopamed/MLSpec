# ml-experiment-workflow Specification

## ADDED Requirements

### Requirement: ML experiment schema

The system SHALL provide a built-in OpenSpec schema named `ml-experiment` that defines an artifact graph for machine learning experimentation.

#### Scenario: Schema loads successfully

- **WHEN** a change is created with `--schema ml-experiment`
- **THEN** the system loads the schema from `schemas/ml-experiment/schema.yaml`
- **AND** the artifact graph contains artifacts in the order: experiment, protocol, prepare, evidence, resolution

#### Scenario: Artifact dependency chain

- **WHEN** the ml-experiment schema is loaded
- **THEN** experiment artifact has no dependencies
- **AND** protocol artifact requires experiment
- **AND** prepare artifact requires protocol
- **AND** evidence artifact requires prepare
- **AND** resolution artifact requires evidence

### Requirement: Experiment artifact

The experiment artifact SHALL capture the ML question framing including hypothesis, expected mechanism, intervention, baseline/comparator, and decision target.

#### Scenario: Experiment template contains required sections

- **WHEN** the experiment artifact template is loaded
- **THEN** the template includes sections for: hypothesis, expected mechanism, intervention, baseline/comparator, controlled variables, decision target

### Requirement: Protocol artifact

The protocol artifact SHALL define the experimental methodology including metrics, compute budget, time budget, success criteria, and invalidation conditions.

#### Scenario: Protocol template contains required sections

- **WHEN** the protocol artifact template is loaded
- **THEN** the template includes sections for: baseline/treatment definition, controlled variables, metrics, compute budget, time budget, success criteria, invalidation conditions

### Requirement: Prepare artifact

The prepare artifact SHALL define implementation readiness including configs, eval harness, smoke checks, and logging setup.

#### Scenario: Prepare template supports checkbox tracking

- **WHEN** the prepare artifact template is loaded
- **THEN** the template uses checkbox format `- [ ]` for task tracking
- **AND** the schema configures `apply.tracks: prepare.md`

### Requirement: Evidence artifact

The evidence artifact SHALL capture experimental results including commands, configs, commits, metrics, samples, artifacts, deviations, and validity checks.

#### Scenario: Evidence template contains required sections

- **WHEN** the evidence artifact template is loaded
- **THEN** the template includes sections for: commands run, configs used, commits, metrics observed, samples, artifacts produced, deviations from protocol, validity checks

### Requirement: Resolution artifact

The resolution artifact SHALL conclude the experiment with a decision (accepted/rejected/inconclusive/invalid/needs-rerun) and specify next steps.

#### Scenario: Resolution template supports all decision types

- **WHEN** the resolution artifact template is loaded
- **THEN** the template includes decision options: accepted, rejected, inconclusive, invalid, needs-rerun
- **AND** the template includes a section for next steps and cost analysis
