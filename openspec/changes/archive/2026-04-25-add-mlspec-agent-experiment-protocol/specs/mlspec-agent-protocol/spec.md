## ADDED Requirements

### Requirement: Agent Experiment Protocol Documentation

The system SHALL provide an agent experiment protocol document that AI coding agents can read to understand how to run disciplined ML experiments through MLSpec.

#### Scenario: AGENTS.md created on workspace initialization
- **WHEN** a user runs `openspec ml init`
- **THEN** the system creates `mlspec/AGENTS.md` containing:
  - The agent experiment protocol overview
  - Before running rules (create hypothesis, define controlled variables, plan evidence levels)
  - During running rules (execute planned command, don't change anything except what's being tested)
  - After running rules (record actual_command, changed_files, metrics, interpretation)
  - Evidence level progression guide (E1 cheap proxy → E2 controlled → E3 realistic scale → E4/E5 full validation)
  - Recommended local output path convention
  - Validation expectations (what warnings mean)

#### Scenario: Agent reads AGENTS.md before running experiments
- **WHEN** an AI coding agent starts working in a project with MLSpec
- **THEN** the agent SHOULD read `mlspec/AGENTS.md` to understand the experiment protocol
- **AND** the agent SHOULD follow the before/during/after workflow documented therein

---

### Requirement: Enhanced Hypothesis Template

The system SHALL provide an enhanced hypothesis.md template that forces explicit documentation of what is being tested and how.

#### Scenario: Hypothesis template structure
- **WHEN** `openspec ml new experiment <name>` creates a new experiment
- **THEN** the created `mlspec/experiments/<name>/hypothesis.md` SHALL include sections for:
  - **Hypothesis**: Clear statement of what is being tested
  - **Comparison Reference**: Which baseline or candidate is being compared against
  - **Intended Change**: Specific modification being evaluated
  - **Controlled Variables**: What stays fixed during the experiment (model/architecture, dataset split/sampling, preprocessing/input representation, optimizer/learning-rate schedule, batch size/accumulation, seed(s), training budget/epochs/steps/tokens, evaluation procedure; add domain-specific variables as relevant)
  - **Success Criteria**: Metric thresholds that justify moving to the next evidence level
  - **Abort Criteria**: Results that indicate the experiment should be stopped early
  - **Evidence Level Plan**: Planned progression E1 → E2 → E3 → E4 → E5
  - **Planned Command**: Expected command to execute (optional)
  - **Expected Output Location**: Where outputs should be saved (optional)

#### Scenario: Hypothesis enforces controlled variables thinking
- **WHEN** an agent fills out hypothesis.md
- **THEN** the Controlled Variables section forces explicit thinking about what stays the same
- **AND** this prevents "everything changed at once" experiments where cause cannot be attributed

---

### Requirement: Enhanced Evidence Template

The system SHALL provide an enhanced evidence.md template that records what actually happened, not just what was planned.

#### Scenario: Evidence template structure
- **WHEN** `openspec ml add-evidence <experiment> --level E1` creates a new evidence file
- **THEN** the created evidence file SHALL include:
  - **Frontmatter fields**:
    - `evidence_level`: E1, E2, E3, E4, or E5
    - `recommendation`: promote, reject, inconclusive, retry, hold, or none
    - `comparison_ref`: entity_type and name of comparison target
    - `metrics`: numeric deltas (e.g., `auc_delta`, `f1_delta`)
    - `compute`: dataset_fraction, epochs, folds, seeds, runtime
    - `commands.planned`: The command that was planned (if known)
    - `commands.executed`: The actual command that was executed, if known. Validation warns if missing but does not error.
    - `artifacts.metrics_file`: Path to metrics file (optional)
    - `artifacts.checkpoint`: Path to checkpoint file (optional)
    - `artifacts.predictions`: Path to predictions file (optional)
    - `artifacts.log_file`: Path to training log (optional)
    - `artifacts.changed_files`: List of files actually modified (optional, recommended)
  - **Markdown sections**:
    - What Was Done: Description of experiment setup
    - Changed Files: What was actually modified
    - Results: Table with metrics comparison
    - Interpretation: What the results mean
    - Recommendation: Next action

#### Scenario: Actual command vs planned command
- **WHEN** evidence is recorded
- **THEN** `commands.executed` captures the exact command run
- **AND** `commands.planned` captures the originally planned command
- **AND** the difference between planned and executed is documented in Changed Files

---

### Requirement: Enhanced Decision Template

The system SHALL provide an enhanced decision.md template that forces explicit reasoning.

#### Scenario: Decision template structure
- **WHEN** `openspec ml decide <experiment> --decision <decision>` creates a decision file
- **THEN** the created `mlspec/experiments/<experiment>/decision.md` SHALL include:
  - **Frontmatter fields**:
    - `decision`: promote, reject, inconclusive, hold, or retry
    - `target_candidate`: (required if decision is promote)
    - `rejection_reason`: (required if decision is reject)
    - `uncertainty_reason`: (required if decision is inconclusive)
    - `blocker`: (required if decision is hold)
    - `retry_plan`: (required if decision is retry)
  - **Markdown sections**:
    - **Evidence Considered**: List of evidence files that informed this decision
    - **Reasoning**: Why this decision was made
    - **What This Decision Proves**: Positive findings with evidence
    - **What This Decision Does Not Prove**: Limitations and negative findings not ruled out

---

### Requirement: Validation Warnings for Missing Command and Artifacts

The system SHALL warn (not error) when evidence files lack actual_command or artifact paths.

#### Scenario: Missing actual command warning
- **WHEN** `openspec ml validate` runs on evidence files
- **AND** the evidence frontmatter has no `commands.executed` field
- **THEN** the system SHALL emit a warning:
  ```
  Evidence file has no actual command recorded.
  Evidence may be reconstructed, imported, or recorded manually.
  ```
- **AND** this is a WARNING, not an ERROR
- **AND** validation SHALL NOT fail due to this warning

#### Scenario: Missing artifact paths warning
- **WHEN** `openspec ml validate` runs on evidence files
- **AND** the evidence frontmatter has no `artifacts` section or empty artifact fields
- **THEN** the system SHALL emit a warning:
  ```
  Evidence file has no artifact paths recorded.
  Consider recording metrics_file, checkpoint, or log locations for reproducibility.
  ```
- **AND** this is a WARNING, not an ERROR

#### Scenario: Evidence may be reconstructed or imported
- **WHEN** an agent records evidence after the fact (reconstructed from memory, imported from cloud, manually entered)
- **THEN** the agent MAY leave `commands.executed` empty
- **AND** the agent SHOULD note this in the evidence interpretation section
- **AND** validation SHALL NOT block this workflow

---

### Requirement: Validation Error for Evidence Without Hypothesis

The system SHALL error when evidence exists but hypothesis.md is missing.

#### Scenario: Broken hypothesis-evidence linkage detected
- **WHEN** `openspec ml validate` runs
- **AND** an evidence file exists at `mlspec/experiments/<name>/evidence/<level>.md`
- **AND** no `hypothesis.md` exists in the same experiment directory
- **THEN** the system SHALL emit an ERROR:
  ```
  Experiment '<name>' has evidence but no hypothesis.md.
  Experiments should have a hypothesis before evidence is recorded.
  ```
- **AND** this is an ERROR, not a warning
- **AND** validation SHALL fail with this error

#### Scenario: Manually broken state detected
- **WHEN** a user manually deletes hypothesis.md after creating evidence
- **OR** when evidence is copied from another experiment without hypothesis
- **THEN** validation catches this broken state and reports it as an error

---

### Requirement: Validation Error for Placeholder Metric Values

The system SHALL error when evidence files contain non-numeric metric values, which includes string placeholders like `_0.006_`.

#### Scenario: Placeholder metrics produce schema validation error
- **WHEN** `openspec ml validate` runs on evidence files
- **AND** a metric value is not a number (e.g., `auc_delta: _0.006_` is a string)
- **THEN** the system SHALL emit an error because the `metrics` field expects numeric values
- **AND** validation SHALL fail

**Note:** This is not a separate placeholder check—it is caught by Zod schema validation which expects `metrics` to be `Record<string, number>`. String values like `_0.006_` fail type validation.

---

### Requirement: Validation Warning for Placeholder Decision Values

The system SHALL warn when decision files contain placeholder string values in reasoning fields.

#### Scenario: Placeholder values detected in decision
- **WHEN** `openspec ml validate` runs on decision files
- **AND** `decision: reject` with `rejection_reason: _reason_`
- **OR** `decision: inconclusive` with `uncertainty_reason: _reason_`
- **OR** `decision: hold` with `blocker: _blocker_`
- **OR** `decision: retry` with `retry_plan: _plan_`
- **THEN** the system SHALL emit a warning:
  ```
  Decision contains placeholder value in '<field>'.
  Replace '_placeholder_' with actual reasoning.
  ```

---

### Requirement: Status Protocol State Display

The system SHALL display experiment protocol state in `openspec ml status` to guide next actions.

#### Scenario: Protocol state in status output
- **WHEN** `openspec ml status` runs
- **THEN** each active experiment SHALL display its protocol state:
  - `needs hypothesis`: No hypothesis.md in experiment directory
  - `needs evidence`: hypothesis.md exists, no evidence files
  - `needs decision`: Has evidence, no decision.md
  - `needs promotion`: decision.md with decision=promote, but no candidate version lists this experiment under `supporting_experiments`
  - `needs archive`: Has decision.md and (if promote) has been promoted, not yet archived
- **AND** archived experiments SHALL be shown separately under their archive subdirectory

#### Scenario: Status output format
- **WHEN** `openspec ml status` runs
- **THEN** the output SHALL show experiments grouped by state:
  ```
  ## Active Experiments (3)

  needs hypothesis:
    - exp-020-new-idea

  needs evidence:
    - exp-018-mixup (baseline:v1)

  needs decision:
    - exp-019-augmentation (E1 evidence: AUC +0.006)

  needs promotion:
    - exp-017-cutmix (decision: promote → candidate:v2)

  needs archive:
    - exp-016-weight-decay (decision: reject)
  ```

#### Scenario: Protocol state guides agent next action
- **WHEN** an AI coding agent calls `openspec ml status`
- **THEN** the agent can determine the next action from the protocol state
- **AND** no separate task system is needed