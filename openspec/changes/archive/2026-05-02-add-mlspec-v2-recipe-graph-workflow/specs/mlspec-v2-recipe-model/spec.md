# mlspec-v2-recipe-model Specification

## ADDED Requirements

### Requirement: Recipe Entity Structure

The system SHALL provide recipe entities that represent complete runnable ML pipelines. Each recipe SHALL have:

- `entity_type`: literal "recipe"
- `id`: globally unique identifier within workspace (kebab-case, e.g., `rf-mfcc-v1`)
- `name`: human-readable name
- `tags`: array of tag strings (`baseline`, `candidate`, `current-best`, `variant`, `archived`)
- `parent_recipe`: reference to parent recipe ID or null for root recipes
- `created_by_experiment`: reference to creating experiment ID or null for baselines
- `config`: full ML pipeline configuration object

#### Scenario: Create baseline recipe
- **WHEN** user runs `mlspec new recipe rf-mfcc-v1 --tag baseline`
- **THEN** system creates `mlspec/recipes/rf-mfcc-v1/recipe.yaml`
- **AND** `parent_recipe` is null
- **AND** `created_by_experiment` is null
- **AND** `tags` includes "baseline"

#### Scenario: Create recipe from experiment
- **WHEN** user accepts experiment `rf-from-svc` as recipe `rf-mfcc-v1`
- **THEN** system creates `mlspec/recipes/rf-mfcc-v1/recipe.yaml`
- **AND** `parent_recipe` is `svc-mfcc-v1`
- **AND** `created_by_experiment` is `rf-from-svc`

#### Scenario: Recipe tags allow multiple values
- **WHEN** recipe is created from accepted experiment
- **AND** user tags it with both `candidate` and `variant`
- **THEN** `tags` array contains both values

---

### Requirement: Recipe Directory Structure

Recipes SHALL be stored in `mlspec/recipes/<recipe-id>/` with files:

- `recipe.yaml`: Recipe metadata and config
- `summary.md`: Human-readable summary

#### Scenario: Recipe directory structure
- **WHEN** recipe `rf-mfcc-v1` is created
- **THEN** directory `mlspec/recipes/rf-mfcc-v1/` exists
- **AND** contains `recipe.yaml`
- **AND** contains `summary.md`

---

### Requirement: Recipe ID Uniqueness

Recipe IDs SHALL be globally unique within the workspace.

#### Scenario: Reject duplicate recipe ID
- **WHEN** user attempts to create recipe with ID that already exists
- **THEN** system rejects with error "Recipe with ID 'X' already exists"

---

### Requirement: Recipe Tags

The system SHALL support these tags on recipes:

- `baseline`: Original recipe, never superseded OR historical reference
- `candidate`: Has supporting experiments but not designated current-best
- `current-best`: User-designated best performing recipe for the task
- `variant`: Alternative approach (e.g., fast inference, small model)
- `archived`: No longer actively considered

#### Scenario: Tag a recipe
- **WHEN** user runs `mlspec tag recipe rf-mfcc-v1 current-best`
- **THEN** recipe's `tags` array SHALL include `current-best`

#### Scenario: Multiple current-best allowed
- **WHEN** user tags multiple recipes as `current-best`
- **THEN** system SHALL warn "Multiple recipes tagged current-best"
- **AND** allow the operation (user agency)

#### Scenario: Untag a recipe
- **WHEN** user runs `mlspec untag recipe rf-mfcc-v1 candidate`
- **THEN** recipe's `tags` array SHALL NOT include `candidate`

---

### Requirement: Recipe Lineage via Parent Link

Recipes SHALL maintain lineage via `parent_recipe` field forming a tree/forest to root.

**Important**: `parent_recipe` represents experimental derivation, not model taxonomy. A child recipe is derived from an experiment that modified its parent, not because they share model family.

#### Choosing base_recipe Rule
When creating an experiment, `base_recipe` SHALL be the closest recipe whose components you want to keep fixed except for the proposed change:

- If testing LSTM against RNN baseline → `base_recipe: rnn-mfcc-v1`
- If porting accumulated improvements from the current best recipe → choose the concrete recipe ID currently tagged `current-best` (e.g., `base_recipe: lstm-mfcc-augmented-v1`)
- If starting from an external paper/pretrained model/completely unrelated setup → create a new root recipe directly with `mlspec new recipe <id>` first, do not create an experiment with `base_recipe: null`

**Important**: Experiments always have exactly one `base_recipe`. There is no `base_recipe: null` in V2.

#### Example: RNN vs LSTM
```yaml
# Experiment: replace RNN with LSTM
base_recipe: rnn-mfcc-v1
proposed_recipe: lstm-mfcc-v1
proposed_change: Replace RNN architecture with LSTM while keeping preprocessing/training/evaluation fixed.
```

This is correct because parentage means "derived from this experiment", not "same model family".

#### Scenario: Trace lineage to root
- **WHEN** user runs `mlspec lineage rf-mfcc-v1`
- **THEN** system SHALL show ancestry chain:
  ```
  rf-mfcc-v1
    └── svc-mfcc-v1 (baseline)
  ```

#### Scenario: Detect cycle in parent chain
- **WHEN** experiment would create a recipe whose parent chain contains itself
- **THEN** system SHALL reject with error "Cycle detected in recipe lineage"

#### Scenario: No multi-parent recipes in V2
- **WHEN** user attempts to create recipe with multiple parent_recipe values
- **THEN** system SHALL reject (V2 only supports single parent or null)

#### Scenario: Related recipes via optional reference
- **WHEN** an experiment is inspired by another recipe/branch
- **THEN** it MAY document this in `proposed_change` or use optional `related_recipes` field
- **AND** this is informational only, not used for lineage

---

### Requirement: Recipe Config Structure

Recipe `config` field SHALL contain complete ML pipeline definition:

- `data`: dataset configuration (dataset name/path, features, splits)
- `preprocessing`: list of preprocessing steps
- `model`: model type and hyperparameters
- `training`: training configuration (method, CV, hyperparameter grid)
- `inference`: inference configuration (batch size, etc.)
- `artifacts`: expected artifact files (model, scaler, predictions)

Top-level `metrics` field SHALL contain achieved performance:

- `metrics`: key-value pairs of achieved metrics (accuracy, f1, etc.)

**Note**: `config` describes how to run the recipe. Top-level `metrics` describes achieved performance.

#### Scenario: Recipe config contains reproducibility information
- **WHEN** recipe is loaded from `recipe.yaml`
- **THEN** the `config` object contains or references all information needed to reproduce the pipeline
- **AND** references to local paths, URLs, W&B/MLflow runs, dataset IDs, scripts, and artifact paths are allowed
