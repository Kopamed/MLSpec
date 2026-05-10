# fixture-003-smoke-promoted-as-validation Specification

## Purpose
TBD - created by archiving change mlspec-structured-output. Update Purpose after archive.
## Requirements
### Requirement: Fixture directory structure
The fixture SHALL be located at `fixtures/003-smoke-promoted-as-validation/` with the following structure:
```
fixtures/003-smoke-promoted-as-validation/
├── environment/
│   └── mlspec/experiments/eos-test/
│       ├── experiment.yaml
│       └── runs/
│           ├── baseline-run/
│           │   ├── run.yaml
│           │   └── metrics.json
│           └── candidate-run/
│               ├── run.yaml
│               └── metrics.json
└── fixture.yaml
```

**Previously:** Structure included `prompt.md` and `expected.txt` at fixture root.

#### Scenario: Fixture has environment/ and fixture.yaml
- **WHEN** fixture is inspected
- **THEN** it has environment/ with experiment data and fixture.yaml at root

### Requirement: Baseline run is validation stage
The baseline run.yaml SHALL have `stage: validation`.

#### Scenario: Baseline has validation stage
- **WHEN** baseline run.yaml is read
- **THEN** stage field is "validation"

### Requirement: Candidate run is smoke stage
The candidate run.yaml SHALL have `stage: smoke`.

#### Scenario: Candidate has smoke stage
- **WHEN** candidate run.yaml is read
- **THEN** stage field is "smoke"

### Requirement: All controls match
Both runs SHALL have identical values for eval_split, metric_script, and dataset.

#### Scenario: Controls match between runs
- **WHEN** baseline and candidate runs are compared
- **THEN** eval_split, metric_script, and dataset values are identical
- **AND** eval_split is "val-v1"
- **AND** metric_script is "eval-v1"
- **AND** dataset is "toy-dataset-v1"

### Requirement: Candidate metric improves
The candidate accuracy SHALL be higher than baseline accuracy.

#### Scenario: Candidate outperforms baseline
- **WHEN** metrics are compared
- **THEN** candidate accuracy > baseline accuracy

### Requirement: Experiment requires validation stage
The experiment's success_criteria SHALL require `min_stage: validation`.

#### Scenario: Experiment requires validation
- **WHEN** experiment success_criteria is checked
- **THEN** min_stage is "validation"

### Requirement: Expected verdict
The expected verdict SHALL be INVALID due to insufficient evidence stage.

**Previously:** `expected.txt` contained substring "evidence stage too weak"

#### Scenario: Expected verdict is INVALID
- **WHEN** mlspec checks this fixture
- **THEN** verdict is INVALID

