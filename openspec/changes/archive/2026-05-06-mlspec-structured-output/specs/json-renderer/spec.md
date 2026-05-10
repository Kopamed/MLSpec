# JSON Renderer

## ADDED Requirements

### Requirement: JSON output flag
The `--json` flag SHALL cause output to be rendered as JSON.

### Requirement: JSON output structure
The JSON output SHALL be a single object containing:
- verdict: string ("VALID" | "INVALID" | "NOT_SUPPORTED")
- experiment: string (experiment ID)
- objective: string
- claim: object with metric and direction
- metrics: object with baseline and candidate values
- failures: array of failure objects (empty if verdict is VALID or NOT_SUPPORTED)
- allowedConclusions: array of strings
- disallowedConclusions: array of strings (only for INVALID)

### Requirement: Failure object structure
Each failure object SHALL contain:
- type: string
- message: string
- field?: string (for control mismatches)
- baseline?: unknown (for control mismatches)
- candidate?: unknown (for control mismatches)

### Requirement: Example JSON output
```json
{
  "verdict": "INVALID",
  "experiment": "eos-test",
  "objective": "Test whether adding EOS handling improves generation termination.",
  "claim": {
    "metric": "accuracy",
    "direction": "increase"
  },
  "metrics": {
    "baseline": { "accuracy": 0.8, "eval_split": "val-v1" },
    "candidate": { "accuracy": 0.91, "eval_split": "train-v1" }
  },
  "failures": [
    {
      "type": "control",
      "message": "Control mismatch: eval_split",
      "field": "eval_split",
      "baseline": "val-v1",
      "candidate": "train-v1"
    }
  ],
  "allowedConclusions": [
    "The candidate produced a higher reported metric in its own run."
  ],
  "disallowedConclusions": [
    "The candidate is better than the baseline.",
    "The intervention caused the improvement.",
    "The candidate recipe should be promoted."
  ]
}
```
