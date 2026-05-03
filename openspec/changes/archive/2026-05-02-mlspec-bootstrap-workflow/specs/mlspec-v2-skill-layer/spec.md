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

### Requirement: Skills Ask One Focused Question When Genuinely Ambiguous

Skills SHALL ask one focused question only when input is genuinely ambiguous, not in routine cases.

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

#### Scenario: Bootstrap mode with obvious baseline
- **WHEN** workspace is empty and baseline ID and approach are obvious
- **THEN** skill SHALL proceed without asking
- **AND** SHALL show inferred action before executing

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

### Requirement: mlspec-propose Boundaries (Normal Mode)

In normal mode (at least one recipe exists), `mlspec-propose` skill SHALL:

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
- Create recipe nodes (except in bootstrap mode)

#### Scenario: Propose creates experiment files
- **WHEN** skill completes proposal in normal mode
- **THEN** `experiment.yaml` and `hypothesis.md` exist in `experiments/<id>/`
- **AND** experiment status is `draft`

---

### Requirement: mlspec-run Boundaries (Normal Mode)

In normal mode (with active experiments), `mlspec-run` skill SHALL:

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
- **WHEN** skill completes run in normal mode
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

### Requirement: Bootstrap Skill Chaining

Skills SHALL chain appropriately in bootstrap scenario.

#### Scenario: Explore suggests propose after empty workspace detection
- **WHEN** `/mlspec-explore` completes in empty workspace
- **THEN** output SHALL include "Next: /mlspec-propose <baseline-id>"

#### Scenario: Propose suggests run after bootstrap
- **WHEN** `/mlspec-propose` completes bootstrap (root recipe created)
- **THEN** output SHALL include "Next: /mlspec-run" to establish baseline metrics

---

### Requirement: `/mlspec-next` Bootstrap Routing

When the workspace is empty or baseline-only, `/mlspec-next` SHALL route the user to the correct bootstrap action.

#### Scenario: Empty workspace
- **WHEN** user runs `/mlspec-next`
- **AND** `mlspec/recipes/` is missing or contains no recipe subdirectories
- **THEN** skill SHALL recommend `/mlspec-explore`
- **AND** explain that no baseline recipe exists yet

#### Scenario: Baseline exists but no metrics
- **WHEN** user runs `/mlspec-next`
- **AND** at least one baseline/current-best recipe exists
- **AND** no experiments exist
- **AND** the selected baseline recipe has no metrics
- **THEN** skill SHALL recommend `/mlspec-run`
- **AND** explain that baseline metrics should be established before proposing experiments

#### Scenario: Baseline exists with metrics but no experiments
- **WHEN** user runs `/mlspec-next`
- **AND** a baseline/current-best recipe exists with metrics
- **AND** no experiments exist
- **THEN** skill SHALL recommend `/mlspec-explore` or `/mlspec-propose`
- **AND** explain that the workspace is ready for the first experiment

#### Scenario: Multiple possible baseline recipes
- **WHEN** multiple baseline/current-best recipes exist
- **AND** the next action depends on selecting one
- **THEN** skill SHALL infer the current-best if unambiguous
- **OR** ask one focused question if ambiguous

---

## MODIFIED Requirements

### Requirement: mlspec-explore Empty Workspace Behavior

`mlspec-explore` skill SHALL detect when the workspace has no recipes and inspect the project to recommend a baseline approach.

#### Scenario: Explore detects empty workspace
- **WHEN** user runs `/mlspec-explore` with `mlspec/recipes/` empty
- **THEN** skill SHALL output "No recipes found" message
- **AND** SHALL inspect the project structure

#### Scenario: Explore greenfield bootstrap (no scripts/configs)
- **WHEN** workspace is empty and no training scripts or configs exist
- **THEN** skill SHALL recommend a minimal starter baseline approach
- **AND** output SHALL suggest a recipe ID
- **AND** output SHALL note that no existing implementation was found

#### Scenario: Explore brownfield bootstrap (existing project)
- **WHEN** workspace is empty and training scripts, configs, or outputs exist
- **THEN** skill SHALL identify the likely existing approach
- **AND** SHALL infer a baseline recipe ID from project name or config

#### Scenario: Explore remains read-only in empty workspace
- **WHEN** workspace is empty
- **THEN** skill SHALL NOT create any files
- **AND** SHALL NOT run any `mlspec` CLI commands

---

### Requirement: mlspec-propose Bootstrap Mode (Exception to Normal Boundaries)

**This is the only exception to the normal `mlspec-propose` boundary.**

When no recipes exist, `/mlspec-propose` SHALL operate in bootstrap mode and create a root baseline recipe, not an experiment.

#### Scenario: Bootstrap creates root recipe
- **WHEN** user runs `/mlspec-propose` with no recipes in workspace
- **THEN** skill SHALL infer or ask for baseline recipe ID
- **AND** SHALL create `recipes/<id>/recipe.yaml` with:
  - `parent_recipe: null`
  - `created_by_experiment: null`
  - `tags: [baseline, current-best]`
- **AND** SHALL NOT create an experiment

#### Scenario: Bootstrap tags recipe appropriately
- **WHEN** bootstrap creates a root recipe
- **THEN** skill SHALL tag it `baseline`
- **AND** SHALL tag it `current-best`

#### Scenario: Bootstrap greenfield creates skeletal recipe
- **WHEN** workspace is empty and no training scripts/configs exist
- **THEN** skill SHALL create a skeletal root recipe with TODO config fields
- **AND** SHALL mark metrics as pending
- **AND** SHALL recommend implementation work or `/mlspec-run` next

#### Scenario: Bootstrap brownfield attempts metric discovery
- **WHEN** workspace is empty but existing project files are found
- **THEN** skill SHALL attempt best-effort metric discovery from:
  - Local scripts, configs, outputs, logs, notebooks
  - README or documentation
  - Known tracker references (W&B, MLflow) if configured
- **AND** SHALL populate `metrics` in `recipe.yaml` if clearly discoverable
- **AND** SHALL leave `metrics` empty/pending if not clearly discoverable
- **AND** SHALL NOT require external service access

#### Scenario: Bootstrap shows action then proceeds if unambiguous
- **WHEN** baseline ID and approach are obvious from context
- **THEN** skill SHALL show inferred action
- **AND** SHALL proceed without asking

#### Scenario: Bootstrap asks when genuinely ambiguous
- **WHEN** baseline ID or approach is genuinely ambiguous
- **THEN** skill SHALL ask one focused question

---

### Requirement: mlspec-run Baseline Evaluation Mode

When recipes exist but no experiments, `/mlspec-run` SHALL support baseline evaluation without requiring an experiment.

#### Scenario: Run baseline evaluation when no experiments exist
- **WHEN** user runs `/mlspec-run` with no experiments but baseline recipe exists
- **THEN** skill SHALL offer to evaluate the baseline recipe
- **AND** SHALL update `recipes/<id>/recipe.yaml` top-level `metrics` field
- **AND** SHALL update `recipes/<id>/summary.md` if appropriate
- **AND** SHALL NOT create experiment evidence files

#### Scenario: Run suggests evaluation when baseline has no metrics
- **WHEN** user runs `/mlspec-run` and baseline recipe has no `metrics`
- **THEN** skill SHALL suggest running baseline evaluation first
- **AND** SHALL NOT fail or produce error

---

### Requirement: Bootstrap State Detection

Skills SHALL detect bootstrap state by checking for empty `mlspec/recipes/` directory.

#### Scenario: Detect empty recipes directory
- **WHEN** skill checks `mlspec/recipes/` and no subdirectories exist
- **THEN** skill SHALL treat workspace as in bootstrap state

#### Scenario: Detect non-empty recipes directory
- **WHEN** skill checks `mlspec/recipes/` and at least one recipe exists
- **THEN** skill SHALL treat workspace as in normal state
- **AND** SHALL NOT attempt bootstrap behavior

---

### Requirement: Bootstrap Skill Chaining

Skills SHALL chain appropriately in bootstrap scenario.

#### Scenario: Explore suggests propose after empty workspace detection
- **WHEN** `/mlspec-explore` completes in empty workspace
- **THEN** output SHALL include "Next: /mlspec-propose <baseline-id>"

#### Scenario: Propose suggests run after bootstrap
- **WHEN** `/mlspec-propose` completes bootstrap (root recipe created)
- **THEN** output SHALL include "Next: /mlspec-run" to establish baseline metrics
