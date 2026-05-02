# mlspec-v2-experiment-model Specification

## ADDED Requirements

### Requirement: Experiment Entity Structure

The system SHALL provide experiment entities representing hypothesis-driven proposed changes to recipes. Each experiment SHALL have:

- `entity_type`: literal "experiment"
- `id`: globally unique identifier within workspace
- `status`: `draft` | `running` | `resolved`
- `base_recipe`: reference to recipe ID being modified
- `proposed_recipe`: reference to proposed recipe ID (not yet created)
- `proposed_change`: description of what changes from base
- `controlled_variables`: list of what stays fixed
- `success_criteria`: list of metric thresholds to justify acceptance
- `abort_criteria`: list of conditions to abandon early
- `evidence_plan`: planned evidence stages

#### Scenario: Create experiment
- **WHEN** user runs `mlspec new experiment add-roi-cropping --from rf-mfcc-v1 --proposes rf-mfcc-roi-v1`
- **THEN** system creates `mlspec/experiments/add-roi-cropping/experiment.yaml`
- **AND** `base_recipe` is `rf-mfcc-v1`
- **AND** `proposed_recipe` is `rf-mfcc-roi-v1`
- **AND** `status` is `draft`

#### Scenario: Experiment proposed_recipe is not pre-created
- **WHEN** experiment `add-roi-cropping` is created with `proposed_recipe: rf-mfcc-roi-v1`
- **THEN** `mlspec/recipes/rf-mfcc-roi-v1/` SHALL NOT exist
- **AND** recipe SHALL only be created when experiment is accepted

---

### Requirement: Experiment Status Transitions

Experiments SHALL transition through states: `draft` → `running` → `resolved`.

#### Scenario: Set experiment to running
- **WHEN** user runs `mlspec set-status add-roi-cropping running`
- **THEN** experiment's `status` becomes `running`

#### Scenario: Status transitions are forward-only
- **WHEN** experiment has `status: resolved`
- **THEN** `set-status` SHALL reject with error "Cannot change status of resolved experiment"

---

### Requirement: Hypothesis Document

Each experiment SHALL have `hypothesis.md` with detailed hypothesis and context.

#### Scenario: Hypothesis document structure
- **WHEN** experiment is created
- **THEN** `mlspec/experiments/<id>/hypothesis.md` exists
- **AND** contains sections for: hypothesis statement, controlled variables, success criteria, abort criteria, evidence plan

---

### Requirement: Experiment Directory Structure

Experiments SHALL be stored in `mlspec/experiments/<experiment-id>/` with files:

- `experiment.yaml`: Experiment metadata
- `hypothesis.md`: Detailed hypothesis
- `evidence/`: Evidence files directory
- `resolution.md`: Resolution (when resolved)

#### Scenario: Experiment directory structure
- **WHEN** experiment `add-roi-cropping` is created
- **THEN** directory `mlspec/experiments/add-roi-cropping/` exists
- **AND** contains `experiment.yaml`
- **AND** contains `hypothesis.md`
- **AND** contains `evidence/` directory (empty initially)
- **AND** does NOT contain `resolution.md` until resolved

---

### Requirement: Experiment ID Uniqueness

Experiment IDs SHALL be globally unique within the workspace.

#### Scenario: Reject duplicate experiment ID
- **WHEN** user attempts to create experiment with ID that already exists
- **THEN** system rejects with error "Experiment with ID 'X' already exists"
