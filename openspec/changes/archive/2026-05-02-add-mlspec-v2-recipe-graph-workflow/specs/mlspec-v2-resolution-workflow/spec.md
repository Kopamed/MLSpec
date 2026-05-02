# mlspec-v2-resolution-workflow Specification

## ADDED Requirements

### Requirement: Resolution Verbs

The system SHALL provide direct resolution verbs:

- `accept`: Accept the experiment, create new recipe
- `reject`: Reject the experiment, graph unchanged
- `retry`: Retry with modifications, return to running
- `hold`: Pause the experiment for later; graph unchanged
- `inconclusive`: Evidence neither supports nor refutes hypothesis

#### Scenario: Accept experiment
- **WHEN** user runs `mlspec accept add-roi-cropping --as rf-mfcc-roi-v1 --tag candidate`
- **THEN** system creates `mlspec/recipes/rf-mfcc-roi-v1/recipe.yaml`
- **AND** `parent_recipe` is `rf-mfcc-v1`
- **AND** `created_by_experiment` is `add-roi-cropping`
- **AND** experiment `status` becomes `resolved`

#### Scenario: Accept with --config
- **WHEN** user runs `mlspec accept <experiment> --as <recipe> --tag <tag> --config <file>`
- **THEN** system SHALL use the provided `<file>` as the recipe config
- **AND** the config file MUST be a valid YAML file

#### Scenario: Accept without --config
- **WHEN** user runs `mlspec accept <experiment> --as <recipe> --tag <tag>` (without --config)
- **THEN** system SHALL copy `base_recipe` config
- **AND** add a `_TODO_review_required` marker indicating config must be updated to match `proposed_change`
- **AND** the recipe config SHALL contain: `config: { ...copied_config, _TODO_review_required: "..." }`

#### Scenario: Reject experiment
- **WHEN** user runs `mlspec reject add-roi-cropping --reason "negative delta"`
- **THEN** experiment `status` becomes `resolved`
- **AND** `rejection_reason` is recorded in `resolution.md`
- **AND** no recipe is created

---

### Requirement: Resolution Document

Resolved experiments SHALL have `resolution.md` with:

- YAML frontmatter with `entity_type`, `experiment_id`, `resolution`, `created`
- `resolution`: accept | reject | retry | hold | inconclusive
- `accepted_recipe`, `accepted_tags` (if accept)
- `rejection_reason`, `uncertainty_reason`, `blocker` (if applicable)
- `revisit_condition`, `retry_plan` (if applicable)
- `rationale`: explanation of decision
- `supporting_evidence[]`: references to evidence

#### Scenario: Resolution document on accept
- **WHEN** experiment is accepted
- **THEN** `resolution.md` SHALL contain:
  ```yaml
  resolution: accept
  accepted_recipe: <recipe-id>
  accepted_tags: [candidate]
  rationale: <explanation>
  supporting_evidence:
    - stage: smoke
      summary: <summary>
  ```

---

### Requirement: Accept Creates Recipe Node

Accepting an experiment SHALL create a new recipe node, not a new version.

#### Scenario: Accept creates distinct recipe
- **WHEN** experiment `rf-from-svc` is accepted as `rf-mfcc-v1`
- **THEN** `mlspec/recipes/rf-mfcc-v1/` is created as NEW directory
- **AND** it has `parent_recipe: svc-mfcc-v1`
- **AND** previous recipes with similar names are unaffected

---

### Requirement: Resolved Experiments Stay Visible

Resolved experiments SHALL remain in `experiments/` directory.

#### Scenario: Resolved experiment not archived
- **WHEN** experiment is resolved (accept, reject, etc.)
- **THEN** experiment stays in `mlspec/experiments/<id>/`
- **AND** is visible in `mlspec list experiments --status resolved`

---

### Requirement: Acceptance Warning Matrix

The system SHALL warn based on evidence stage vs target tag:

| Evidence Stage | accept as candidate | accept as current-best |
|----------------|---------------------|-----------------------|
| smoke | warning | strong warning |
| validation | ok | normal |
| final | ok | strongest support |

#### Scenario: Accept as candidate from smoke
- **WHEN** user accepts experiment as `candidate` with only `smoke` evidence
- **THEN** system SHALL warn "Accepting as candidate from smoke evidence is premature"
- **AND** proceed with acceptance

#### Scenario: Accept as current-best from smoke
- **WHEN** user accepts experiment as `current-best` with only `smoke` evidence
- **THEN** system SHALL warn "Strong warning: accepting as current-best from smoke evidence"
- **AND** proceed with acceptance

#### Scenario: Accept as current-best from validation
- **WHEN** user accepts experiment as `current-best` with `validation` evidence
- **THEN** system SHALL proceed normally (expected workflow)

#### Scenario: Accept as current-best with final evidence
- **WHEN** user accepts experiment as `current-best` with `final` evidence
- **THEN** system SHALL note "Final evidence provides strongest support for current-best"
- **AND** proceed with acceptance

---

### Requirement: Reject Requires Reason

Rejecting an experiment SHALL require a reason.

#### Scenario: Reject with reason
- **WHEN** user runs `mlspec reject add-roi-cropping --reason "negative delta"`
- **THEN** `resolution.md` SHALL contain `rejection_reason: "negative delta"`

#### Scenario: Reject without reason
- **WHEN** user runs `mlspec reject add-roi-cropping` without `--reason`
- **THEN** system SHALL prompt for rejection reason
- **OR** reject with error if `--reason` is required and not provided

---

### Requirement: Retry Requires Plan

Retrying an experiment SHALL require a plan.

#### Scenario: Retry with plan
- **WHEN** user runs `mlspec retry add-roi-cropping --plan "increase n_estimators to 300"`
- **THEN** experiment `status` returns to `running`
- **AND** `retry_plan` is recorded
- **AND** `retry_count` is incremented (if tracking)
