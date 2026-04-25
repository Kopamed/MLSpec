## ADDED Requirements

### Requirement: MLSpec Workspace

The system SHALL support a `mlspec/` workspace directory structure for ML experimentation, distinct from the `openspec/` workspace used for software development.

#### Scenario: MLSpec workspace initialization
- **WHEN** a user runs `openspec ml init` in a project directory
- **THEN** the system creates the `mlspec/` directory with subdirectories: `baselines/`, `experiments/`, `candidates/`, `findings/`, `archive/`
- **AND** the system creates `mlspec/evaluation.md` from template
- **AND** the system creates `mlspec/.workspace.yaml` with workspace metadata

#### Scenario: MLSpec workspace is independent
- **WHEN** a project contains both `openspec/` and `mlspec/` workspaces
- **THEN** operations on `openspec/` do not affect `mlspec/` and vice versa
- **AND** each workspace uses its own schema and configuration

---

### Requirement: MLSpec Entity Types

The system SHALL support the following first-class entity types in MLSpec.

#### Scenario: Experiment entity creation
- **WHEN** a user creates a new experiment with `openspec ml new experiment <name>`
- **THEN** the system creates `mlspec/experiments/<name>/` directory
- **AND** the system creates `mlspec/experiments/<name>/.experiment.yaml` with fields:
  - `entity_type: experiment`
  - `schema: ml-experiment`
  - `comparison_ref`: reference to baseline or candidate being compared against
  - `created`: creation date
- **AND** the system creates `mlspec/experiments/<name>/hypothesis.md` from template

#### Scenario: Baseline entity creation
- **WHEN** a user creates a new baseline with `openspec ml new baseline <name>`
- **THEN** the system creates `mlspec/baselines/<name>/` directory
- **AND** the system creates `mlspec/baselines/<name>/.baseline.yaml` with fields:
  - `entity_type: baseline`
  - `created`: creation date
  - `superseded_by`: (optional) reference to newer baseline
- **AND** the system creates `mlspec/baselines/<name>/baseline.yaml` (configuration)
- **AND** the system creates `mlspec/baselines/<name>/baseline.md` (summary with metrics)
- **AND** baselines are never rejected; they can be superseded

#### Scenario: Candidate entity creation
- **WHEN** a user creates a new candidate with `openspec ml new candidate <name>`
- **THEN** the system creates `mlspec/candidates/<name>/` directory
- **AND** the system creates `mlspec/candidates/<name>/.candidate.yaml` with fields:
  - `entity_type: candidate`
  - `name`: candidate name
  - `current_version`: current version number
  - `latest_finalized_version`: (optional) highest finalized version number
  - `versions[]`: array of version records
- **AND** the system resolves `current_version` through `.candidate.yaml` metadata, not symlinks
- **AND** `current_version` may point to a draft version (meaning latest working version)

#### Scenario: Finding entity structure
- **WHEN** a finding file exists at `mlspec/findings/<name>.md`
- **THEN** it is a plain markdown file (no special metadata required)
- **AND** it is manually maintained (not automatically generated)
- **AND** it contains: what works, what doesn't, evidence references, caveats

---

### Requirement: Evidence Levels

The system SHALL support evidence levels as first-class metadata for experiments.

#### Scenario: Evidence level definitions
- **GIVEN** the following evidence level definitions:
  - **E0**: Hypothesis only; represented by `hypothesis.md` (no evidence file needed)
  - **E1**: Cheap proxy / smoke test — tests if idea has any signal at minimal cost
  - **E2**: Controlled small experiment — tests if signal is real and reproducible under controlled conditions
  - **E3**: Medium-scale validation — tests if signal transfers at realistic scale
  - **E4**: Full cross-validation / near-final validation
  - **E5**: Final production / submission candidate
- **THEN** evidence files SHALL have `evidence_level` set to one of E1, E2, E3, E4, E5
- **AND** E0 is represented by the existence of `hypothesis.md`, not by an evidence file

#### Scenario: Evidence file frontmatter
- **WHEN** an evidence file is created at `mlspec/experiments/<name>/evidence/<level>.md`
- **THEN** the file SHALL contain YAML frontmatter with:
  - `evidence_level`: one of E1, E2, E3, E4, E5
  - `recommendation`: one of promote, reject, inconclusive, retry, hold, none
  - `comparison_ref`: reference to the entity being compared against, with fields:
    - `entity_type`: one of baseline, candidate
    - `name`: name of the baseline or candidate
  - `metrics`: object containing metric deltas (e.g., `auc_delta`, `f1_delta`)
  - `compute`: object containing relevant compute information such as dataset_fraction, epochs, folds, seeds, runtime, accelerator, cost, token_budget, image_size, or domain-specific fields

---

### Requirement: Experiment Decision Outcomes

The system SHALL support explicit decision outcomes for experiments.

#### Scenario: Decision outcome types
- **GIVEN** the following decision outcome types:
  - **promote**: Experiment provides sufficient evidence to incorporate into a candidate recipe
  - **reject**: Experiment showed insufficient improvement or negative results
  - **inconclusive**: Results are ambiguous or context-dependent
  - **hold**: Experiment should wait for other results or conditions
  - **retry**: Experiment should be re-run with modifications
- **WHEN** a user creates `decision.md` for an experiment
- **THEN** the file SHALL contain frontmatter with:
  - `decision`: one of promote, reject, inconclusive, hold, retry
  - If `decision: promote`: `target_candidate` field specifying which candidate
  - If `decision: reject`: `rejection_reason` field
  - If `decision: inconclusive`: `uncertainty_reason` field
  - If `decision: hold`: `blocker` or `revisit_condition` field
  - If `decision: retry`: `retry_plan` field

#### Scenario: Recommendation vs decision distinction
- **WHEN** evidence file frontmatter is created
- **THEN** the field `recommendation` SHALL be used for the evidence's suggested outcome
- **AND** `recommendation` reflects what this evidence level suggests: promote, reject, inconclusive, retry, hold, or none
- **WHEN** `decision.md` is created
- **THEN** the field `decision` SHALL be used for the final experiment outcome
- **AND** `decision` is the authoritative outcome after considering all evidence

---

### Requirement: Candidate Recipe Versioning

The system SHALL support versioned candidate recipes with draft/finalized semantics.

#### Scenario: Version creation via promote command
- **WHEN** a user runs `openspec ml promote <experiment> --to <candidate>`
- **THEN** the system verifies `decision.md` has `decision: promote` with `target_candidate`
- **AND** the system creates a new version by copying the current recipe file
- **AND** the new version has `status: draft`
- **AND** the new version records `supporting_experiments` including the promoted experiment
- **AND** `.candidate.yaml` `current_version` is incremented

#### Scenario: Version immutability after finalized
- **WHEN** a version has `status: finalized` in `.candidate.yaml`
- **THEN** the version file SHALL NOT be modified
- **AND** new changes require creating a new version

#### Scenario: Resolving current version
- **WHEN** the system or user needs to resolve the current recipe version
- **THEN** the system reads `current_version` from `.candidate.yaml`
- **AND** the system reads `versions[]` array to find the corresponding recipe file
- **AND** no filesystem symlinks are used

---

### Requirement: Archive Subdirectories

The system SHALL organize archived experiments into subdirectories by decision outcome.

#### Scenario: Archive directory mapping
- **WHEN** an experiment is archived with `openspec ml archive <experiment>`
- **THEN** the system reads `decision` from `decision.md`
- **AND** the experiment is moved to the corresponding archive subdirectory:
  - `decision: promote` → `mlspec/archive/promoted/`
  - `decision: reject` → `mlspec/archive/rejected/`
  - `decision: inconclusive` → `mlspec/archive/inconclusive/`
  - `decision: hold` → `mlspec/archive/held/`
  - `decision: retry` → `mlspec/archive/retry/`

#### Scenario: Archive preservation
- **WHEN** an experiment is archived
- **THEN** the experiment directory is moved to the appropriate archive subdirectory
- **AND** the experiment directory is preserved intact (not merged into any canonical state)
- **AND** the archive preserves the full experiment record including all evidence and decisions

---

### Requirement: MLSpec Validation Rules

The system SHALL validate MLSpec entities with appropriate rigor.

#### Scenario: Structural validation errors
- **WHEN** validation runs on MLSpec entities
- **THEN** the following are hard errors that block operations:
  - Malformed YAML in any metadata or artifact file
  - Missing required frontmatter fields in evidence files
  - Broken entity references (comparison_ref pointing to non-existent baseline or candidate)
  - Invalid `evidence_level` enum value (not in E1, E2, E3, E4, E5)
  - `decision: promote` without `target_candidate`
  - Missing required artifact files for entity type

#### Scenario: ML quality warnings
- **WHEN** validation detects suspicious ML patterns
- **THEN** the following are warnings that flag patterns without blocking:
  - Evidence at E2 shows worse metrics than E1 (possible transfer failure)
  - Evidence at E3 shows worse metrics than E2 (possible scale transfer problem)
  - `decision: promote` with only E1 evidence (thin evidence for strong conclusion)
  - Only a single seed used (low robustness)
  - Reference to superseded baseline
  - Finding not updated since related experiments completed

---

### Requirement: Findings Knowledge Base

The system SHALL support a findings knowledge base for synthesized experiment knowledge.

#### Scenario: Finding file structure
- **WHEN** a finding file exists at `mlspec/findings/<name>.md`
- **THEN** it SHOULD contain:
  - What works (with experiment references supporting the claim)
  - What doesn't work (with experiment references)
  - Context/caveats (when findings don't apply)
  - Confidence level (if specified)

#### Scenario: Finding maintenance reminder
- **WHEN** an experiment is promoted or archived
- **THEN** the CLI prints a reminder:
  ```
  Consider updating findings/<name>.md with this result.
  ```
- **AND** findings remain manually maintained (not auto-generated)

#### Scenario: Finding validation
- **WHEN** `openspec ml validate` runs
- **THEN** the system MAY flag findings that haven't been updated despite related experiments completing
- **AND** this is a warning, not an error
