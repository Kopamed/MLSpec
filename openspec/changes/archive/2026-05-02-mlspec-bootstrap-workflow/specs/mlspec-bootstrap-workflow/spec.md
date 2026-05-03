# mlspec-bootstrap-workflow Specification

## ADDED Requirements

### Requirement: `/mlspec-explore` Empty Workspace Detection

When the MLSpec workspace has no recipes, `/mlspec-explore` SHALL detect this state and inspect the project to recommend a baseline approach.

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

#### Scenario: Explore remains read-only
- **WHEN** workspace is empty
- **THEN** skill SHALL NOT create any files
- **AND** SHALL NOT run any `mlspec` CLI commands

---

### Requirement: `/mlspec-propose` Bootstrap Mode (Exception to Normal Boundaries)

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

### Requirement: `/mlspec-propose` Normal Mode (baseline exists)

When a baseline recipe exists, `/mlspec-propose` SHALL create normal experiments as before.

#### Scenario: Normal proposal when baseline exists
- **WHEN** user runs `/mlspec-propose <id>` with at least one recipe existing
- **THEN** skill SHALL behave as specified in `mlspec-v2-skill-layer`
- **AND** SHALL create `experiments/<id>/experiment.yaml` and `hypothesis.md`

---

### Requirement: `/mlspec-run` Baseline Evaluation Mode

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

### Requirement: CLI Remain Explicit and Scriptable

The MLSpec CLI SHALL remain explicit and scriptable. Bootstrap behavior is handled by skills, not CLI changes.

#### Scenario: CLI commands unchanged
- **WHEN** user runs `mlspec new recipe` or `mlspec tag` directly
- **THEN** CLI SHALL behave as currently specified
- **AND** skills SHALL call these CLI commands internally

#### Scenario: No new CLI commands for bootstrap
- **WHEN** bootstrap workflow is implemented
- **THEN** no new `mlspec` CLI subcommands SHALL be added
- **AND** bootstrap is entirely skill-layer behavior
