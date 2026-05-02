## ADDED Requirements

### Requirement: MLSpec Workflow Skill Templates

The system SHALL provide six MLSpec workflow skill templates that enable agents to enter specific modes for each stage of the ML experimentation lifecycle.

#### Scenario: MLSpec workflow template modules exist
- **WHEN** `src/core/templates/workflows/mlspec-*.ts` modules are imported
- **THEN** the system SHALL provide skill and command templates for:
  - `mlspec-explore`: Thinking mode for ML experiment ideas
  - `mlspec-propose-experiment`: Create experiment with hypothesis
  - `mlspec-run-evidence`: Run one evidence level
  - `mlspec-decide`: Write decision from evidence
  - `mlspec-promote`: Promote experiment to candidate
  - `mlspec-archive`: Archive decided experiment

#### Scenario: MLSpec templates exported from skill-templates.ts
- **WHEN** `getSkillTemplates()` is called
- **THEN** the returned array SHALL include MLSpec workflow entries with `dirName` matching the workflow ID

---

### Requirement: MLSpec Skills Generated for All Configured Tools

The system SHALL generate MLSpec skills for every configured tool that supports skill generation via `skillsDir`.

#### Scenario: Skills installed for all tools with skillsDir
- **WHEN** `openspec init --tools <tool>` runs
- **AND** the tool has `skillsDir` configured
- **THEN** MLSpec skills SHALL be generated at:
  ```
  <skillsDir>/skills/mlspec-explore/SKILL.md
  <skillsDir>/skills/mlspec-propose-experiment/SKILL.md
  <skillsDir>/skills/mlspec-run-evidence/SKILL.md
  <skillsDir>/skills/mlspec-decide/SKILL.md
  <skillsDir>/skills/mlspec-promote/SKILL.md
  <skillsDir>/skills/mlspec-archive/SKILL.md
  ```

#### Scenario: Skills use canonical template content
- **WHEN** MLSpec skill files are generated
- **THEN** the content SHALL match the corresponding template's `instructions` field
- **AND** YAML frontmatter SHALL include `generatedBy: "<version>"`

---

### Requirement: MLSpec Commands Generated for All Configured Tools

The system SHALL generate MLSpec commands for every configured tool that supports command generation via an adapter.

#### Scenario: Commands installed for all tools with adapters
- **WHEN** `openspec init --tools <tool>` runs
- **AND** the tool has an adapter registered
- **THEN** MLSpec commands SHALL be generated using the tool's adapter

#### Scenario: OpenCode adapter uses mlspec-*.md naming
- **WHEN** OpenCode adapter generates MLSpec commands
- **THEN** the output file names SHALL use `mlspec-*.md` format:
  ```
  .opencode/commands/mlspec-explore.md
  .opencode/commands/mlspec-propose-experiment.md
  .opencode/commands/mlspec-run-evidence.md
  .opencode/commands/mlspec-decide.md
  .opencode/commands/mlspec-promote.md
  .opencode/commands/mlspec-archive.md
  ```
- **AND** non-MLSpec commands SHALL continue using `opsx-<id>.md` format

#### Scenario: Other adapters use existing conventions
- **WHEN** Claude, Cursor, Windsurf, or other adapters generate MLSpec commands
- **THEN** they SHALL use their existing command path and naming conventions (e.g., `.claude/commands/opsx/mlspec-*.md`)

---

### Requirement: MLSpec Workflows in Profile System

The system SHALL treat MLSpec workflows as first-class workflows in the profile system.

#### Scenario: MLSpec workflows in ALL_WORKFLOWS
- **WHEN** `ALL_WORKFLOWS` is defined
- **THEN** it SHALL include the six MLSpec workflow IDs

#### Scenario: WORKFLOW_TO_SKILL_DIR includes MLSpec entries
- **WHEN** `WORKFLOW_TO_SKILL_DIR` is defined
- **THEN** it SHALL map each MLSpec workflow ID to itself:
  ```typescript
  'mlspec-explore': 'mlspec-explore',
  'mlspec-propose-experiment': 'mlspec-propose-experiment',
  // etc.
  ```

#### Scenario: SKILL_NAMES includes MLSpec entries
- **WHEN** `SKILL_NAMES` is defined
- **THEN** it SHALL include the six MLSpec skill directory names

---

### Requirement: MLSpec Skill Templates Match Existing Content

The system SHALL use content equivalent to the manually-created MLSpec skill files.

#### Scenario: mlspec-explore skill content
- **WHEN** `getMlspecExploreSkillTemplate()` is called
- **THEN** the returned template SHALL include:
  - `name`: 'mlspec-explore'
  - `description`: Matching existing skill
  - `instructions`: Including guardrails (do not run training, do not modify code)

#### Scenario: mlspec-run-evidence skill content
- **WHEN** `getMlspecRunEvidenceSkillTemplate()` is called
- **THEN** the returned template SHALL include:
  - `name`: 'mlspec-run-evidence'
  - Guardrails preventing decision/promote actions
  - Instructions for recording `commands.executed` in evidence

#### Scenario: Other MLSpec skills maintain equivalent content
- **WHEN** MLSpec template functions are called
- **THEN** their content SHALL be equivalent to the manually-created skill files in `.opencode/skills/mlspec-*/`

---

### Requirement: OpenCode Adapter Exception for MLSpec Commands

The system SHALL modify the OpenCode adapter to emit MLSpec commands with `mlspec-*.md` filenames.

#### Scenario: OpenCode adapter detects MLSpec command IDs
- **WHEN** `getFilePath('mlspec-explore')` is called on OpenCode adapter
- **THEN** the returned path SHALL be `.opencode/commands/mlspec-explore.md`
- **WHEN** `getFilePath('explore')` is called on OpenCode adapter
- **THEN** the returned path SHALL be `.opencode/commands/opsx-explore.md`

---

### Requirement: Existing OpenSpec Workflows Unaffected

The system SHALL NOT break existing OpenSpec SWE workflow generation.

#### Scenario: OpenSpec workflows still generate
- **WHEN** `openspec init --tools <tool>` runs
- **THEN** OpenSpec workflows (explore, propose, apply, archive, etc.) SHALL still be generated
- **AND** their content and file paths SHALL match existing behavior

#### Scenario: OpenCode adapter still handles opsx-* commands
- **WHEN** OpenCode adapter generates commands for non-MLSpec workflow IDs
- **THEN** the output file names SHALL continue using `opsx-<id>.md` format
