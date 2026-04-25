## ADDED Requirements

### Requirement: MLSpec OpenCode Skills

The system SHALL provide OpenCode agent skills for MLSpec workflows, enabling agents to enter specific modes for each stage of the ML experimentation lifecycle.

#### Scenario: MLSpec skills directory structure
- **WHEN** an agent queries available skills
- **THEN** the system SHALL provide six MLSpec skills:
  - `mlspec-explore`: Thinking mode for ML experiment ideas
  - `mlspec-propose-experiment`: Create experiment with hypothesis
  - `mlspec-run-evidence`: Run one evidence level
  - `mlspec-decide`: Write decision from evidence
  - `mlspec-promote`: Promote experiment to candidate
  - `mlspec-archive`: Archive decided experiment

#### Scenario: Skill file locations
- **WHEN** MLSpec skills are installed
- **THEN** skill files SHALL exist at:
  - `.opencode/skills/mlspec-explore/SKILL.md`
  - `.opencode/skills/mlspec-propose-experiment/SKILL.md`
  - `.opencode/skills/mlspec-run-evidence/SKILL.md`
  - `.opencode/skills/mlspec-decide/SKILL.md`
  - `.opencode/skills/mlspec-promote/SKILL.md`
  - `.opencode/skills/mlspec-archive/SKILL.md`

#### Scenario: Command file locations
- **WHEN** MLSpec skills are installed
- **THEN** command files SHALL exist at:
  - `.opencode/commands/mlspec-explore.md`
  - `.opencode/commands/mlspec-propose-experiment.md`
  - `.opencode/commands/mlspec-run-evidence.md`
  - `.opencode/commands/mlspec-decide.md`
  - `.opencode/commands/mlspec-promote.md`
  - `.opencode/commands/mlspec-archive.md`

#### Scenario: Skill frontmatter schema
- **WHEN** an agent reads an MLSpec skill
- **THEN** each SKILL.md SHALL contain YAML frontmatter with:
  - `name`: matching the skill directory name
  - `description`: brief description for skill selection
  - `license`: MIT
  - `compatibility`: Requires openspec CLI and MLSpec workspace
  - `metadata.author`: openspec
  - `metadata.version`: "1.0"

---

### Requirement: Explicit Handoff Between Lifecycle Stages

The MLSpec skills SHALL enforce explicit handoff between lifecycle stages, preventing automatic progression.

#### Scenario: explore does not create
- **WHEN** an agent uses `mlspec-explore`
- **THEN** the skill SHALL NOT automatically create experiments
- **AND** the skill MAY suggest creating an experiment but SHALL NOT proceed without explicit request

#### Scenario: propose-experiment does not run evidence
- **WHEN** an agent uses `mlspec-propose-experiment`
- **THEN** the skill SHALL NOT automatically invoke `mlspec-run-evidence`
- **AND** the skill SHALL stop after creating hypothesis.md

#### Scenario: run-evidence does not decide
- **WHEN** an agent uses `mlspec-run-evidence`
- **THEN** the skill SHALL NOT automatically invoke `mlspec-decide`
- **AND** the skill SHALL stop after recording one evidence level

#### Scenario: decide does not promote
- **WHEN** an agent uses `mlspec-decide`
- **THEN** the skill SHALL NOT automatically invoke `mlspec-promote`
- **AND** the skill SHALL stop after creating decision.md

#### Scenario: promote does not archive
- **WHEN** an agent uses `mlspec-promote`
- **THEN** the skill SHALL NOT automatically invoke `mlspec-archive`
- **AND** the skill SHALL remind user to archive after promotion

#### Scenario: archive checks lifecycle state
- **WHEN** an agent uses `mlspec-archive`
- **THEN** the skill SHALL verify decision.md exists
- **AND** if decision is `promote`, the skill SHALL verify promotion was completed
- **AND** the skill SHALL remind user to update findings

---

### Requirement: Guardrails Matrix

Each MLSpec skill SHALL have explicit guardrails defining what it must and must not do.

#### Scenario: mlspec-explore guardrails
- **WHEN** an agent uses `mlspec-explore`
- **THEN** the skill MUST read MLSpec workspace context
- **AND** the skill MUST NOT run training commands
- **AND** the skill MUST NOT modify code or data

#### Scenario: mlspec-propose-experiment guardrails
- **WHEN** an agent uses `mlspec-propose-experiment`
- **THEN** the skill MUST fill all hypothesis sections
- **AND** the skill MUST ensure comparison_ref is set
- **AND** the skill MUST validate before finishing
- **AND** the skill MUST NOT run training

#### Scenario: mlspec-run-evidence guardrails
- **WHEN** an agent uses `mlspec-run-evidence`
- **THEN** the skill MUST require experiment name and evidence level
- **AND** the skill MUST read and confirm hypothesis before executing
- **AND** the skill MUST record commands.executed in evidence
- **AND** the skill MUST validate after recording
- **AND** the skill MUST NOT decide or promote

#### Scenario: mlspec-decide guardrails
- **WHEN** an agent uses `mlspec-decide`
- **THEN** the skill MUST read all evidence files
- **AND** the skill MUST distinguish what evidence proves vs does not prove
- **AND** the skill MUST NOT promote or archive

#### Scenario: mlspec-promote guardrails
- **WHEN** an agent uses `mlspec-promote`
- **THEN** the skill MUST verify decision is `promote`
- **AND** the skill MUST verify target candidate exists
- **AND** the skill MUST remind to edit draft recipe
- **AND** the skill MUST NOT archive

#### Scenario: mlspec-archive guardrails
- **WHEN** an agent uses `mlspec-archive`
- **THEN** the skill MUST verify decision exists
- **AND** the skill MUST verify promotion completed for promote decisions
- **AND** the skill MUST remind to update findings
- **AND** the skill MUST NOT promote

---

### Requirement: Skill Output Recommendations

Each MLSpec skill SHALL output recommended next steps after completing its action.

#### Scenario: Output includes next step options
- **WHEN** an MLSpec skill completes its primary action
- **THEN** the output SHALL include 2-3 recommended next steps
- **AND** the output SHALL ask what the user wants to do next
