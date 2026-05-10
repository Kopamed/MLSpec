# Run Metrics

## ADDED Requirements

### Requirement: Run YAML format
Each run SHALL have a `run.yaml` file in its directory containing metadata about the run. It SHALL use YAML format.

### Requirement: Run metadata fields
The run.yaml SHALL include:
- `id`: Run identifier (string)
- `role`: Either "baseline" or "candidate" (string)
- `stage`: Evidence stage: "smoke", "validation", or "final" (string)
- `status`: Run completion status: "completed" or "failed" (string)
- `command`: The command that was executed (string)
- `metrics_path`: Path to the metrics JSON file, relative to run directory (string)
- `provenance`: Optional object with execution context

#### Scenario: Valid run.yaml
```yaml
id: baseline-run
role: baseline
stage: validation
status: completed
command: python eval.py --config configs/baseline.yaml
metrics_path: metrics.json
provenance:
  git_commit: abc123
  git_dirty: false
  config_path: configs/baseline.yaml
```

### Requirement: Run role values
The role field SHALL be exactly "baseline" for the control run or "candidate" for the run being tested.

### Requirement: Stage ranking
Stages represent evidence quality with the following ranking (lowest to highest):
- smoke: Quick test, minimal evidence
- validation: Proper validation on held-out data
- final: Full evaluation

### Requirement: Provenance fields
The provenance object MAY contain:
- `git_commit`: Git commit SHA (string)
- `git_dirty`: Whether the working tree had uncommitted changes (boolean)
- `config_path`: Path to configuration used (string)

### Requirement: Metrics JSON format
Each run SHALL have a `metrics.json` file containing the actual metric values. It SHALL be a flat key-value object where values may be numbers, strings, booleans, or null.

#### Scenario: Valid metrics.json
```json
{
  "accuracy": 0.8,
  "loss": 0.62,
  "eval_split": "val-v1",
  "metric_script": "eval-v1",
  "dataset": "toy-dataset-v1"
}
```

### Requirement: Metrics value types
Metric values SHALL be one of:
- number: For numeric metrics (e.g., accuracy, loss)
- string: For categorical values (e.g., eval_split name)
- boolean: For flags
- null: For missing values
