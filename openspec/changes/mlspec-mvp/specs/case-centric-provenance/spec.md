## ADDED Requirements

### Requirement: Case is the root experiment container

The system SHALL create a `Case` for every distinct ML experiment question. A Case has: `id`, `question` (what is being investigated), `mode` (scratch | structured | decision), `status` (proposed | ready | running | observed | resolved | reopened | archived), `current_protocol_id`, `owner_refs[]`, `tags[]`, `actor_ref`, `created_at`.

A Case MUST NOT transition to `ready` without an active Protocol. A Case MUST NOT transition to `resolved` without at least one Decision.

#### Scenario: Create a new case
- **WHEN** an agent calls `mlspec case create --question "Does label smoothing improve accuracy on MNIST?" --actor agent:claude`
- **THEN** the system returns a Case with status `proposed`, mode `scratch`, and a UUIDv7 `id`
- **AND** the Case is persisted to the store

#### Scenario: Case cannot be ready without protocol
- **WHEN** an agent attempts to transition a Case to `ready` status
- **THEN** the system SHALL reject the transition if `current_protocol_id` is null
- **AND** return `code: PROTOCOL_REQUIRED`

#### Scenario: Case cannot be resolved without decision
- **WHEN** an agent attempts to transition a Case to `resolved` status
- **THEN** the system SHALL reject if no Decision exists for this Case
- **AND** return `code: DECISION_REQUIRED`

### Requirement: Protocol defines the experimental contract

The system SHALL support a `Protocol` bound to a Case. A Protocol has: `id`, `case_id`, `version`, `objective`, `baseline_spec`, `dataset_specs[]`, `metric_spec` ({name, direction, split}), `required_resources` (ResourceBudget), `min_decision_grade`, `acceptance_rule`, and `locked_at` timestamp.

A Protocol MUST be locked before any evidence-bearing Run can begin. A locked Protocol is immutable — no field may change after `locked_at` is set.

#### Scenario: Lock protocol
- **WHEN** an agent calls `mlspec protocol lock --case <id> --protocol <id>`
- **THEN** the Protocol's `locked_at` is set to the current timestamp
- **AND** subsequent attempts to modify the Protocol are rejected with `code: PROTOCOL_LOCKED`

#### Scenario: Run cannot begin without locked protocol for evidence-bearing work
- **WHEN** an agent calls `mlspec run begin --case <id> --kind full` with no locked Protocol
- **THEN** the system SHALL reject with `code: PROTOCOL_NOT_LOCKED`
- **AND** the Run is not created

### Requirement: Snapshot freezes workspace context

The system SHALL support a `Snapshot` that captures the state of the workspace at the time a Run is executed. A Snapshot has: `id`, `case_id`, `commit_hash`, `dirty_tree`, `diff_digest`, `config_digests[]`, `dataset_digests[]`, `split_manifest_digest`, `evaluator_digest`, `environment_digest`, `actor_ref`, `created_at`.

A Snapshot is created before `run begin` for structured/decision mode runs. The Snapshot's digests establish the lineage of what produced the Run's outputs.

#### Scenario: Create snapshot
- **WHEN** an agent calls `mlspec snapshot create --case <id> --actor agent:claude`
- **THEN** the system captures current commit hash, lists config files, computes digests, and records dirty tree status
- **AND** returns a Snapshot with `created_at` timestamp

#### Scenario: Evidence-bearing run requires snapshot
- **WHEN** an agent calls `mlspec run begin --case <id> --kind full` in structured or decision mode
- **THEN** the system SHALL reject if no Snapshot exists for this Case since the last code change
- **AND** return `code: SNAPSHOT_REQUIRED`

### Requirement: Run records execution

The system SHALL support a `Run` bound to a Case and optionally a Protocol and Snapshot. A Run has: `id`, `case_id`, `protocol_id`, `snapshot_id`, `kind` (smoke | proxy | full | replication), `status` (planned | queued | running | completed | failed | aborted), `command[]`, `tracker_refs[]`, `commit_hash`, `environment_digest`, `input_artifact_refs[]`, `actual_resources` (ResourceBudget), `output_refs[]`, `interrupt_reason`, `started_at`, `ended_at`.

A Run's `actual_resources` MUST be recorded at `run end`. A Run without `actual_resources` cannot support evidence above `smoke` grade.

#### Scenario: Begin run
- **WHEN** an agent calls `mlspec run begin --case <id> --protocol <id> --kind full --command "python train.py"`
- **THEN** the system creates a Run with status `running` and `started_at` timestamp
- **AND** the Run is linked to the Protocol and any existing Snapshot

#### Scenario: End run with resources
- **WHEN** an agent calls `mlspec run end --run <id> --status completed --resources @resources.json`
- **THEN** the system updates the Run with status `completed`, `actual_resources`, and `ended_at`
- **AND** returns the updated Run

#### Scenario: Failed run cannot be evidence for accept
- **WHEN** an agent attempts to create Evidence citing a Run with `status: failed`
- **THEN** the system SHALL reject with `code: RUN_STATUS_INVALID_FOR_EVIDENCE`
- **AND** the Evidence is not created

### Requirement: Deviation captures protocol drift

The system SHALL support a `Deviation` bound to a Run. A Deviation has: `id`, `run_id`, `category`, `description`, `severity` (minor | material | fatal), `impact` (none | weakens | invalidates), `declared_by_actor_ref`, `resolved` (bool).

Any unresolved `material` deviation caps Evidence grade at `partial`. Any `fatal` deviation caps Evidence grade at `invalid`.

#### Scenario: Record deviation
- **WHEN** an agent calls `mlspec deviation record --run <id> --severity material --impact weakens --category "fewer_epochs" --description "Ran 80 epochs instead of 100"`
- **THEN** the Deviation is persisted and linked to the Run
- **AND** subsequent Evidence classification accounts for the deviation

#### Scenario: Unresolved material deviation caps grade
- **WHEN** Evidence is classified for a Run with an unresolved `material` Deviation
- **THEN** the computed Evidence grade SHALL NOT exceed `partial`
- **AND** `protocol_satisfied` SHALL be `partial`
