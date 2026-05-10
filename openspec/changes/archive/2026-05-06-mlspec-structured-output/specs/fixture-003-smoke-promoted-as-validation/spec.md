# Fixture 003: Smoke Promoted as Validation

## ADDED Requirements

### Requirement: Fixture directory structure
The fixture SHALL be located at `fixtures/003-smoke-promoted-as-validation/` with the following structure:
```
fixtures/003-smoke-promoted-as-validation/
├── mlspec/
│   └── experiments/
│       └── eos-test/
│           ├── experiment.yaml
│           └── runs/
│               ├── baseline-run/
│               │   ├── run.yaml
│               │   └── metrics.json
│               └── candidate-run/
│                   ├── run.yaml
│                   └── metrics.json
├── prompt.md
└── expected.txt
```

### Requirement: Baseline run is validation stage
The baseline run.yaml SHALL have `stage: validation`.

### Requirement: Candidate run is smoke stage
The candidate run.yaml SHALL have `stage: smoke`.

### Requirement: All controls match
Both runs SHALL have identical values for:
- eval_split: "val-v1"
- metric_script: "eval-v1"
- dataset: "toy-dataset-v1"

### Requirement: Candidate metric improves
The candidate accuracy SHALL be higher than baseline accuracy.

### Requirement: Experiment requires validation stage
The experiment's success_criteria SHALL require `min_stage: validation`.

### Requirement: Expected verdict
The expected verdict SHALL be INVALID due to insufficient evidence stage.

### Requirement: Expected output substring
The `expected.txt` SHALL contain: "evidence stage too weak"
