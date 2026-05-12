## ADDED Requirements

### Requirement: Import from MLflow

The system SHALL support `mlspec import from mlflow --path <mlruns-path>` which scans an MLflow tracking directory and creates MLSpec records for discovered runs.

Import SHALL extract: run name, parameters, metrics, start/end times, artifacts, and git commit hash if available. All extracted values SHALL be stored with `confidence: high` if verifiable, `confidence: low` if inferred.

#### Scenario: Import MLflow run
- **WHEN** `mlspec import from mlflow --path ./mlruns` is called
- **THEN** the system scans the MLflow directory structure
- **AND** creates Case, Protocol (unlocked), Run, and Evidence records for each experiment
- **AND** Evidence grade is capped at `partial` for imported runs lacking full provenance

### Requirement: Import infers what it can, marks unknowns explicitly

Import from any source SHALL NOT silently backfill missing provenance. If a field cannot be verified — dataset digest, split manifest, evaluator digest, environment — it SHALL be stored as `null` with `confidence: low` and `verification_required: true`.

The agent SHALL NOT claim these unknown fields as valid without verification.

#### Scenario: Import without git commit
- **WHEN** an MLflow run is imported that has no git commit hash
- **THEN** the Run's `commit_hash` is stored as `null`
- **AND** `environment_confidence` is set to `low`
- **AND** `verification_required` includes `commit_hash`
- **AND** Evidence from this run cannot exceed `partial` grade

### Requirement: Import from repository scan

The system SHALL support `mlspec import from repo` which scans the current repository to detect:
- Tracker type (MLflow via `mlruns/`, Kubeflow via pipeline manifests, or none)
- Config files (for dataset names, splits, hyperparameters)
- Training scripts (for model architecture, evaluation logic)
- Existing run logs

Import creates a Case with discovered context and marks unknowns.

#### Scenario: Repo scan detects MLflow
- **WHEN** `mlspec import from repo` is called in a directory containing `mlruns/`
- **THEN** the system detects MLflow as the tracker
- **AND** invokes `mlspec import from mlflow`
- **AND** reports what was detected and what is unknown

### Requirement: Imported evidence capped at partial without full lineage

Any Evidence created from imported runs SHALL NOT exceed `partial` grade unless all of the following are verifiable: commit_hash, config_digests, split_manifest_digest, evaluator_digest, actual_resources.

This prevents the brownfield import from fabricating decision-grade evidence from legacy runs that lack proper provenance.

#### Scenario: Imported run cannot achieve decision_grade without verification
- **WHEN** an imported Run lacks `commit_hash`, `environment_digest`, and `evaluator_digest`
- **AND** `mlspec evidence classify --run <id>` is called
- **THEN** the system SHALL return grade `partial` at most
- **AND** `warnings` SHALL include `IMPORTED_RUN_LACKS_FULL_LINEAGE`

### Requirement: Import reports trust gap

After import, the system SHALL provide a `trust_report` summarizing:
- What was imported and how
- Which fields are verified vs inferred vs missing
- What minimum reruns would be needed to upgrade legacy evidence to decision_grade

This is the "what can we trust" answer for the brownfield story.

#### Scenario: Import produces trust report
- **WHEN** `mlspec import from repo` completes
- **THEN** the system outputs a trust report:
  ```json
  {
    "runs_imported": 12,
    "fully_verified": 2,
    "partially_verified": 7,
    "unverified": 3,
    "upgrade_reruns_needed": [
      { "run": "run_01", "missing": ["commit_hash", "evaluator_digest"], "cost": "1 GPU-hour" }
    ],
    "trustable_conclusions": "Only the 2 fully_verified runs support decision_grade claims"
  }
  ```
