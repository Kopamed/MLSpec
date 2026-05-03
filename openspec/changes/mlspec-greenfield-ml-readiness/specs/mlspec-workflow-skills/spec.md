# mlspec-workflow-skills Specification

## Purpose

This capability provides MLSpec workflow skill templates and command generation for ML experimentation within the OpenSpec system. MLSpec workflows enable AI agents to enter specific modes for each stage of the ML experimentation lifecycle (explore, propose, run, resolve, next).

## MODIFIED Requirements

### Requirement: MLSpec Workflow Skill Templates

The system SHALL provide five MLSpec workflow skill templates that enable agents to enter specific modes for each stage of the ML experimentation lifecycle.

#### Scenario: MLSpec workflow template modules exist
- **WHEN** `src/core/templates/workflows/mlspec-*.ts` modules are imported
- **THEN** the system SHALL provide skill and command templates for:
  - `mlspec-explore`: Thinking mode for ML experiment ideas (read-only)
  - `mlspec-propose`: Create experiment from idea (read-only, no training)
  - `mlspec-run`: Run or record evidence for a stage
  - `mlspec-resolve`: Resolve experiment with decision
  - `mlspec-next`: Get next recommended action

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
  <skillsDir>/skills/mlspec-propose/SKILL.md
  <skillsDir>/skills/mlspec-run/SKILL.md
  <skillsDir>/skills/mlspec-resolve/SKILL.md
  <skillsDir>/skills/mlspec-next/SKILL.md
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
  .opencode/commands/mlspec-propose.md
  .opencode/commands/mlspec-run.md
  .opencode/commands/mlspec-resolve.md
  .opencode/commands/mlspec-next.md
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
- **THEN** it SHALL include the five MLSpec workflow IDs

#### Scenario: WORKFLOW_TO_SKILL_DIR includes MLSpec entries
- **WHEN** `WORKFLOW_TO_SKILL_DIR` is defined
- **THEN** it SHALL map each MLSpec workflow ID to itself:
  ```typescript
  'mlspec-explore': 'mlspec-explore',
  'mlspec-propose': 'mlspec-propose',
  'mlspec-run': 'mlspec-run',
  'mlspec-resolve': 'mlspec-resolve',
  'mlspec-next': 'mlspec-next',
  ```

#### Scenario: SKILL_NAMES includes MLSpec entries
- **WHEN** `SKILL_NAMES` is defined
- **THEN** it SHALL include the five MLSpec skill directory names

---

### Requirement: MLSpec Skill Templates Match Existing Content

The system SHALL use content equivalent to the manually-created MLSpec skill files.

#### Scenario: mlspec-explore skill content
- **WHEN** `getMlspecExploreSkillTemplate()` is called
- **THEN** the returned template SHALL include:
  - `name`: 'mlspec-explore'
  - `description`: Matching existing skill
  - `instructions`: Including guardrails (read-only mode, do not run training, do not modify code)

#### Scenario: mlspec-propose skill content
- **WHEN** `getMlspecProposeSkillTemplate()` is called
- **THEN** the returned template SHALL include:
  - `name`: 'mlspec-propose'
  - Guardrails preventing training and implementation edits
  - Instructions for experiment design and hypothesis only

#### Scenario: mlspec-run skill content
- **WHEN** `getMlspecRunSkillTemplate()` is called
- **THEN** the returned template SHALL include:
  - `name`: 'mlspec-run'
  - Instructions for run-readiness discipline (dataset profiling, accelerator preflight, training ladder checklist)
  - Instructions for recording `commands.executed` in evidence
  - Instructions for target-leakage sanity checks
  - Instructions for generation-collapse metrics

#### Scenario: mlspec-next skill content
- **WHEN** `getMlspecNextSkillTemplate()` is called
- **THEN** the returned template SHALL include:
  - `name`: 'mlspec-next'
  - Instructions for using `mlspec next --json` to get recommendations
  - Instructions to NOT recommend duplicate evidence stages

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