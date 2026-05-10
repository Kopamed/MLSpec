# Fixture 002: Metric Script Mismatch

## ADDED Requirements

### Requirement: Fixture directory structure
The fixture SHALL be located at `fixtures/002-metric-script-mismatch/` with the following structure:
```
fixtures/002-metric-script-mismatch/
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

### Requirement: Baseline run uses eval-v1
The baseline run metrics.json SHALL have `"metric_script": "eval-v1"`.

### Requirement: Candidate run uses eval-v2
The candidate run metrics.json SHALL have `"metric_script": "eval-v2"`.

### Requirement: All other controls match
Both runs SHALL have identical values for:
- eval_split: "val-v1"
- dataset: "toy-dataset-v1"

### Requirement: Expected verdict
The expected verdict SHALL be INVALID due to control mismatch on metric_script.

### Requirement: Expected output substring
The `expected.txt` SHALL contain: "Control mismatch: metric_script"
