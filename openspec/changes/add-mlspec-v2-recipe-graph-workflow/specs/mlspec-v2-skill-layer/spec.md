# mlspec-v2-skill-layer Specification

## ADDED Requirements

### Requirement: Five MLSpec V2 Skills

The system SHALL provide exactly five MLSpec skills:

- `mlspec-explore`: Think, inspect, diagnose, propose possible experiments
- `mlspec-propose`: Turn an idea into a concrete recipe-delta experiment
- `mlspec-run`: Run or record evidence for one experiment stage
- `mlspec-resolve`: Resolve an experiment based on evidence
- `mlspec-next`: Read-only router, recommend next action

#### Scenario: Skill names match exactly
- **WHEN** MLSpec V2 skills are generated
- **THEN** they SHALL be named exactly: `mlspec-explore`, `mlspec-propose`, `mlspec-run`, `mlspec-resolve`, `mlspec-next`

---

### Requirement: Skills Infer Missing Inputs

Skills SHALL infer missing inputs from:

- Current conversation context
- Most recent `/mlspec-explore` output
- `mlspec next` output
- Active experiments in workspace
- Current-best/candidate recipe tags
- User's last stated intent

#### Scenario: mlspec-propose infers from exploration
- **WHEN** user runs `/mlspec-propose` after `/mlspec-explore` output "Recommended experiment: add-roi-cropping from rf-mfcc-v1"
- **THEN** skill SHALL infer `base_recipe: rf-mfcc-v1` and `proposed_recipe: rf-mfcc-roi-v1`
- **AND** present inferred action before executing

#### Scenario: mlspec-run infers active experiment
- **WHEN** user runs `/mlspec-run` with only one active experiment
- **THEN** skill SHALL infer that experiment ID
- **AND** infer stage from evidence state (smoke if no evidence, validation if smoke complete)

---

### Requirement: Skills Show Inferred Action Before Executing

Skills SHALL display what they inferred and what they will do before modifying files.

#### Scenario: Show inferred action
- **WHEN** skill infers missing arguments
- **THEN** output SHALL include:
  ```
  I'm going to:
  - base_recipe: rf-mfcc-v1
  - proposed_recipe: rf-mfcc-roi-v1
  - proposed_change: Add ROI cropping before classification

  Proceeding...
  ```

---

### Requirement: Skills Ask One Focused Question When Ambiguous

Skills SHALL ask one focused question only when input is genuinely ambiguous.

#### Scenario: Ambiguous experiment choice
- **WHEN** user runs `/mlspec-propose` with no context
- **AND** multiple experiments are plausible from exploration
- **THEN** skill SHALL ask:
  ```
  I found multiple possible experiments from exploration:
  1. add-roi-cropping from rf-mfcc-v1
  2. tune-n_estimators from rf-mfcc-v1
  3. try-gradient-boosting from rf-mfcc-v1

  Which one should I propose?
  ```

---

### Requirement: mlspec-explore Boundaries

`mlspec-explore` skill SHALL:

**Allowed:**
- Inspect recipes, experiments, evidence, findings
- Inspect data, code, artifacts
- Reason about failure modes
- Suggest possible experiments

**Forbidden:**
- Create experiment files
- Run training
- Resolve experiments

#### Scenario: Explore does not create experiments
- **WHEN** user runs `/mlspec-explore` and identifies a promising experiment
- **THEN** skill outputs recommended next experiment
- **AND** does NOT create experiment files
- **AND** suggests `/mlspec-propose` as next step

---

### Requirement: mlspec-propose Boundaries

`mlspec-propose` skill SHALL:

**Creates:**
- `experiments/<id>/experiment.yaml`
- `experiments/<id>/hypothesis.md`

**Must Define:**
- `base_recipe`
- `proposed_recipe`
- `proposed_change`
- `controlled_variables`
- `success_criteria`
- `abort_criteria`
- `evidence_plan`

**Forbidden:**
- Run training
- Accept/reject/retry/hold/inconclusive
- Create accepted recipe nodes

#### Scenario: Propose creates experiment files
- **WHEN** skill completes proposal
- **THEN** `experiment.yaml` and `hypothesis.md` exist in `experiments/<id>/`
- **AND** experiment status is `draft`

---

### Requirement: mlspec-run Boundaries

`mlspec-run` skill SHALL:

**Must Do:**
- Read `experiment.yaml` and `hypothesis.md`
- Confirm `base_recipe` and `proposed_change`
- Create/update `evidence/<stage>.md`
- Run or record command
- Record metrics, artifacts, runs

**Forbidden:**
- Accept/reject/retry/hold/inconclusive
- Create recipe nodes
- Tag current-best

#### Scenario: Run creates evidence file
- **WHEN** skill completes run
- **THEN** `evidence/<stage>.md` exists with runs and metrics

---

### Requirement: mlspec-resolve Boundaries

`mlspec-resolve` skill SHALL:

**Must Do:**
- Read all evidence files
- Explain what evidence supports/does not prove
- Write `resolution.md`
- If accept: create new recipe node
- Run `mlspec-next` after resolving

**Forbidden:**
- Run training
- Brainstorm unrelated new ideas
- Auto-archive

#### Scenario: Resolve accepts and creates recipe
- **WHEN** skill resolves with `accept`
- **THEN** `recipes/<accepted_recipe>/recipe.yaml` exists
- **AND** `resolution.md` exists in experiment directory
- **AND** `mlspec-next` is run to show next action

---

### Requirement: mlspec-next Is Read-Only

`mlspec-next` skill SHALL:

- Never modify files
- Inspect recipes, experiments, evidence, resolutions, findings, warnings
- Output one recommended next action with rationale
- Be safe to run anytime

#### Scenario: Next outputs recommendation
- **WHEN** user runs `/mlspec-next`
- **THEN** output includes:
  ```
  Recommended next step:
    /mlspec-run validation add-roi-cropping

  Why:
    - smoke evidence is positive (accuracy +2.1%)
    - no validation evidence yet
    - experiment is ready for trusted evaluation

  Context:
    - current-best: rf-mfcc-v1 (93.4%)
    - active experiments: add-roi-cropping (smoke complete)
  ```

---

### Requirement: Skill Chaining

Each skill SHALL output its next recommended action.

#### Scenario: Explore suggests propose
- **WHEN** `/mlspec-explore` completes
- **THEN** output includes "Next: /mlspec-propose"

#### Scenario: Propose suggests run
- **WHEN** `/mlspec-propose` completes
- **THEN** output includes "Next: /mlspec-run <experiment> <stage>"

#### Scenario: Resolve runs next
- **WHEN** `/mlspec-resolve` completes
- **THEN** it runs `/mlspec-next` and displays its output

---

### Requirement: No Hidden Context Files Required

Skills SHALL NOT require hidden temporary context files for correctness.

#### Scenario: Skills use visible workspace files
- **WHEN** skill runs
- **THEN** durable source of truth is `mlspec/` workspace files
- **AND** conversation context may supplement but is not required

---

### Requirement: Stage Inference for mlspec-run

`mlspec-run` SHALL infer stage from evidence state:

| Evidence State | Default Stage |
|----------------|---------------|
| No evidence yet | smoke |
| smoke exists, recommend continue | validation |
| validation exists | ask |
| final exists | ask |

#### Scenario: Infer smoke when no evidence
- **WHEN** user runs `/mlspec-run` for experiment with no evidence
- **THEN** skill infers stage is `smoke`
- **AND** confirms before proceeding
