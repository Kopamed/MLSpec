# experiment-definition Specification

## Purpose
TBD - created by archiving change mlspec-initial. Update Purpose after archive.
## Requirements
### Requirement: Experiment YAML format
The experiment definition SHALL be stored in `experiment.yaml` within the experiment directory. It SHALL use YAML format with the following structure.

### Requirement: Required fields
The experiment definition SHALL include:
- `id`: Unique experiment identifier (string)
- `objective`: Human-readable description of what the experiment tests (string)
- `claim`: Object containing the claim being made
- `baseline`: Object containing baseline run reference
- `candidate`: Object containing candidate run reference
- `required_controls`: List of metric field names that must match between runs (list of strings)
- `success_criteria`: Object containing validation requirements

#### Scenario: Minimal valid experiment
```yaml
id: eos-test
objective: Test whether adding EOS handling improves generation termination
claim:
  text: Candidate improves generation termination compared to baseline
  metric: accuracy
  direction: increase
baseline:
  run: baseline-run
candidate:
  run: candidate-run
required_controls:
  - eval_split
  - metric_script
  - dataset
success_criteria:
  min_stage: validation
  require_valid_comparison: true
```

### Requirement: Claim structure
The claim object SHALL contain:
- `text`: Human-readable claim (string)
- `metric`: Name of the metric being compared (string)
- `direction`: Either "increase" or "decrease" (string)

### Requirement: Run references
Both baseline and candidate objects SHALL contain:
- `run`: The run ID referencing a subdirectory in the runs/ folder (string)

### Requirement: Required controls
The required_controls list SHALL contain field names from the metrics JSON files that MUST be identical between baseline and candidate runs for the comparison to be valid.

#### Scenario: Multiple required controls
```yaml
required_controls:
  - eval_split
  - metric_script
  - dataset
```

### Requirement: Success criteria structure
The success_criteria object SHALL contain:
- `min_stage`: Minimum acceptable evidence stage: "smoke", "validation", or "final" (string)
- `require_valid_comparison`: Whether a valid comparison is required for success (boolean)

