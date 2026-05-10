## Why

ML engineers use AI agents to run experiments, but agents often accept metric improvements as valid evidence without checking whether the comparison is actually valid. A reported improvement from `accuracy: 0.8` to `0.91` looks compelling—but if the candidate used a different eval split or dataset, the comparison is meaningless. MLSpec provides a check command that agents (and engineers) can run to verify whether an experiment conclusion is actually supported by valid evidence.

Core insight: **metric improved ≠ evidence valid**.

## What Changes

- Create `mlspec` CLI tool with `check` command
- `mlspec check <experiment-id>` validates whether a claimed improvement has valid supporting evidence
- Tool reads experiment config and run metrics from `.mlspec/experiments/<id>/`
- Fixtures directory for testing MLSpec itself against adversarial test cases

## Capabilities

### New Capabilities

- `mlspec-check`: The core validation logic. Checks that baseline and candidate runs:
  - Are both completed
  - Meet minimum evidence stage requirements
  - Have matching required controls (eval_split, metric_script, dataset)
  - Actually show the claimed metric improvement in the claimed direction
  Returns verdicts: valid comparison, invalid comparison, or claim not supported.

- `experiment-definition`: YAML format for defining an experiment with:
  - Experiment ID and objective
  - Claim (what metric, what direction improvement expected)
  - Baseline and candidate run references
  - Required controls that must match
  - Success criteria (min_stage, require_valid_comparison)

- `run-metrics`: YAML+JSON format for run data:
  - Run ID, role (baseline/candidate), stage (smoke/validation/final), status
  - Path to metrics JSON file
  - Provenance info (git commit, config path)

- `adversarial-fixtures`: Test cases that expose when agents would incorrectly accept invalid comparisons. Each fixture is a fake project with an experiment that appears to show improvement but has a hidden flaw.

## Impact

- New repository structure under `.mlspec/experiments/`
- New CLI: `mlspec` command with `check` subcommand
- Development fixtures under `fixtures/` for testing MLSpec itself
