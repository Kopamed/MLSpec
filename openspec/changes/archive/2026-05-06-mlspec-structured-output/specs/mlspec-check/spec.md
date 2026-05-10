# MLSpec Check (Modified)

## ADDED Requirements

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
