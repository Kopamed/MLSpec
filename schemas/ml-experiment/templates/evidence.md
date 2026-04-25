---
evidence_level: E1
recommendation: none
comparison_ref:
  entity_type: baseline
  name: _baseline-name_
metrics:
  auc_delta: 0.0
  f1_delta: 0.0
compute:
  dataset_fraction: 1.0
  epochs: 10
  folds: 1
---

# Evidence: _Brief Description_

## What Was Done

_Describe the experiment setup and what was executed._

## Results

| Metric | Baseline | This Experiment | Delta |
|--------|----------|-----------------|-------|
| AUC | | | |
| F1 | | | |

## Observations

_Key observations from this experiment run._

## Interpretation

_What do these results mean? Is there a signal?_

## Recommendations

- **promote**: Continue to next evidence level
- **reject**: Abandon this direction
- **inconclusive**: Need more evidence
- **retry**: Re-run with modifications
- **hold**: Wait for other experiments
