# mlspec-check Specification

## Purpose
TBD - created by archiving change mlspec-initial. Update Purpose after archive.
## Requirements
### Requirement: Check command validates experiment comparison
The MLSpec check command SHALL validate whether a claimed metric improvement is supported by valid evidence. It MUST read the experiment definition and associated run data, then output a verdict.

### Requirement: Validates run completion status
The check command SHALL fail if either baseline or candidate run has status other than "completed".

#### Scenario: Both runs completed
- **WHEN** baseline and candidate runs both have status "completed"
- **THEN** check proceeds to next validation

#### Scenario: Baseline run not completed
- **WHEN** baseline run has status "failed"
- **THEN** check outputs INVALID COMPARISON with reason "Baseline run is not completed"

#### Scenario: Candidate run not completed
- **WHEN** candidate run has status "failed"
- **THEN** check outputs INVALID COMPARISON with reason "Candidate run is not completed"

### Requirement: Validates minimum evidence stage
The check command SHALL verify that both runs meet the minimum evidence stage requirement specified in the experiment's success_criteria.

Stage ranking: smoke < validation < final

#### Scenario: Runs meet minimum stage
- **WHEN** experiment requires min_stage "validation" and both runs have stage "validation" or "final"
- **THEN** check proceeds to next validation

#### Scenario: Baseline stage too weak
- **WHEN** experiment requires min_stage "validation" but baseline run has stage "smoke"
- **THEN** check outputs INVALID COMPARISON with reason "Baseline evidence stage too weak: smoke, required validation"

#### Scenario: Candidate stage too weak
- **WHEN** experiment requires min_stage "validation" but candidate run has stage "smoke"
- **THEN** check outputs INVALID COMPARISON with reason "Candidate evidence stage too weak: smoke, required validation"

### Requirement: Validates required controls match
The check command SHALL verify that all required controls (as specified in experiment.required_controls) have identical values in both baseline and candidate metrics.

#### Scenario: All controls match
- **WHEN** required_controls includes "eval_split" and both runs have eval_split "val-v1"
- **THEN** check proceeds to next validation

#### Scenario: Control mismatch detected
- **WHEN** required_controls includes "eval_split" but baseline has "val-v1" and candidate has "train-v1"
- **THEN** check outputs INVALID COMPARISON with reason "Control mismatch: eval_split" showing both values

### Requirement: Validates metric improvement direction
The check command SHALL verify that the candidate metric improved over baseline in the claimed direction (increase or decrease).

#### Scenario: Metric improved in claimed direction
- **WHEN** claim.direction is "increase" and candidate accuracy (0.91) > baseline accuracy (0.80)
- **THEN** metricImproved is true

#### Scenario: Metric did not improve
- **WHEN** claim.direction is "increase" but candidate accuracy (0.75) <= baseline accuracy (0.80)
- **THEN** metricImproved is false

### Requirement: Outputs valid comparison verdict
When all validations pass and metric improved, the check command SHALL output VERDICT: VALID COMPARISON.

#### Scenario: Valid comparison with improvement
- **WHEN** all validations pass and metric improved
- **THEN** output includes "VERDICT: VALID COMPARISON" and explanation that controls matched and metric improved

### Requirement: Outputs invalid comparison verdict
When any validation fails, the check command SHALL output VERDICT: INVALID COMPARISON with specific failure reasons.

#### Scenario: Invalid due to control mismatch
- **WHEN** validation fails due to control mismatch on "dataset"
- **THEN** output includes "VERDICT: INVALID COMPARISON" and lists "Control mismatch: dataset" as the reason

### Requirement: Outputs claim not supported verdict
When validations pass but metric did not improve, the check command SHALL output VERDICT: CLAIM NOT SUPPORTED.

#### Scenario: Comparison valid but no improvement
- **WHEN** all validations pass but candidate metric (0.75) <= baseline metric (0.80)
- **THEN** output includes "VERDICT: VALID COMPARISON, BUT CLAIM NOT SUPPORTED" explaining metric did not improve

### Requirement: Experiment directory location
**Updated:** Experiment data SHALL be located at `mlspec/experiments/<experiment-id>/`

**Previously:** Experiment data was located at `.mlspec/experiments/<experiment-id>/`

#### Scenario: Read experiment from mlspec directory
- **WHEN** user runs `mlspec check eos-test`
- **THEN** the tool reads from `./mlspec/experiments/eos-test/experiment.yaml`

#### Scenario: Read runs from mlspec directory
- **WHEN** user runs `mlspec check eos-test`
- **THEN** baseline run is read from `./mlspec/experiments/eos-test/runs/<baseline-run>/run.yaml`
- **AND** candidate run is read from `./mlspec/experiments/eos-test/runs/<candidate-run>/run.yaml`

### Requirement: Custom root with --root flag
When `--root <path>` is specified, experiment SHALL be read from `<path>/mlspec/experiments/<experiment-id>/`.

#### Scenario: Custom root path
- **WHEN** user runs `mlspec check eos-test --root ./fixtures/001-eval-split-mismatch`
- **THEN** the tool reads from `./fixtures/001-eval-split-mismatch/mlspec/experiments/eos-test/experiment.yaml`

