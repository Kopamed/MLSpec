# fixture-002-metric-script-mismatch Specification

## Purpose
TBD - created by archiving change mlspec-structured-output. Update Purpose after archive.
## Requirements
### Requirement: Fixture directory structure
The fixture SHALL be located at `fixtures/002-metric-script-mismatch/` with the following structure:
```
fixtures/002-metric-script-mismatch/
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

### Requirement: Baseline run uses eval-v1
The baseline run metrics.json SHALL have `"metric_script": "eval-v1"`.

#### Scenario: Baseline has correct metric_script
- **WHEN** baseline metrics.json is read
- **THEN** metric_script field is "eval-v1"

### Requirement: Candidate run uses eval-v2
The candidate run metrics.json SHALL have `"metric_script": "eval-v2"`.

#### Scenario: Candidate has correct metric_script
- **WHEN** candidate metrics.json is read
- **THEN** metric_script field is "eval-v2"

### Requirement: All other controls match
Both runs SHALL have identical values for eval_split and dataset.

#### Scenario: Controls match between runs
- **WHEN** baseline and candidate runs are compared
- **THEN** eval_split and dataset values are identical
- **AND** eval_split is "val-v1"
- **AND** dataset is "toy-dataset-v1"

### Requirement: Expected verdict
The expected verdict SHALL be INVALID due to control mismatch on metric_script.

**Previously:** `expected.txt` contained substring "Control mismatch: metric_script"

#### Scenario: Expected verdict is INVALID
- **WHEN** mlspec checks this fixture
- **THEN** verdict is INVALID

