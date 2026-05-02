# mlspec-workflow-skills Specification

## MODIFIED Requirements

### Requirement: MLSpec Workflow Skill Templates

The system SHALL provide five MLSpec workflow skill templates (V2) that enable agents to enter specific modes for each stage of the ML experimentation lifecycle.

#### Scenario: MLSpec V2 workflow template modules exist
- **WHEN** `src/core/templates/workflows/mlspec-*.ts` modules are imported
- **THEN** the system SHALL provide skill and command templates for:
  - `mlspec-explore`: Thinking mode for ML experiment ideas
  - `mlspec-propose`: Create experiment from idea
  - `mlspec-run`: Run or record evidence for a stage
  - `mlspec-resolve`: Resolve experiment based on evidence
  - `mlspec-next`: Read-only router for next action

---

### Requirement: MLSpec V2 Skills and Commands Installation

`mlspec init --tools <tool>` and `mlspec update --tools <tool>` SHALL generate BOTH skills AND slash commands for V2 workflows.

#### Scenario: Skills and commands installed via mlspec init
- **WHEN** `mlspec init --tools <tool>` runs
- **AND** the tool has `skillsDir` and `commandsDir` configured
- **THEN** MLSpec V2 skills SHALL be generated at:
  ```
  <skillsDir>/skills/mlspec-explore/SKILL.md
  <skillsDir>/skills/mlspec-propose/SKILL.md
  <skillsDir>/skills/mlspec-run/SKILL.md
  <skillsDir>/skills/mlspec-resolve/SKILL.md
  <skillsDir>/skills/mlspec-next/SKILL.md
  ```
- **AND** MLSpec V2 slash commands SHALL be generated at:
  ```
  <commandsDir>/mlspec-explore.md
  <commandsDir>/mlspec-propose.md
  <commandsDir>/mlspec-run.md
  <commandsDir>/mlspec-resolve.md
  <commandsDir>/mlspec-next.md
  ```

For OpenCode specifically:
- Skills: `.opencode/skills/mlspec-*/SKILL.md`
- Commands: `.opencode/commands/mlspec-*.md`

#### Scenario: Skills and commands refreshed via mlspec update
- **WHEN** `mlspec update --tools <tool>` runs
- **THEN** MLSpec V2 skills and commands SHALL be refreshed at the same paths

#### Scenario: Canonical template source
- **WHEN** `mlspec init --tools <tool>` runs in a fresh directory
- **THEN** the generated skills and commands SHALL be produced from `src/core/templates/workflows/mlspec-*.ts` templates
- **AND** the canonical source SHALL be the template/generation system, NOT pre-existing `.opencode` files

---

### Requirement: Skills Infer from Workspace State

Skills SHALL infer missing inputs from workspace files, not from conversation inference in TypeScript.

#### Scenario: Skill infers from workspace
- **WHEN** skill runs without explicit arguments
- **THEN** skill SHALL infer from workspace files (recipes, experiments, evidence, tags)

#### Scenario: Skill shows inferred action
- **WHEN** skill infers arguments
- **THEN** output SHALL display inferred action before executing

#### Scenario: Skill asks when ambiguous
- **WHEN** skill cannot infer unambiguously from workspace
- **THEN** the agent SHALL ask the user one focused question

---

## REMOVED Requirements

### Requirement: Six MLSpec Workflow Skill Templates

**Reason**: Replaced by V2 model with 5 skills instead of 6. The old skills (mlspec-propose-experiment, mlspec-run-evidence, mlspec-decide, mlspec-promote, mlspec-archive) are removed.

### Requirement: mlspec-propose-experiment Skill

**Reason**: Replaced by mlspec-propose with workspace-based inference.

### Requirement: mlspec-run-evidence Skill

**Reason**: Replaced by mlspec-run with evidence stages (smoke/validation/final) instead of E1-E5.

### Requirement: mlspec-decide Skill

**Reason**: Replaced by mlspec-resolve with direct resolution verbs (accept/reject/retry/hold/inconclusive).

### Requirement: mlspec-promote Skill

**Reason**: Replaced by mlspec-resolve with accept action. Accept creates new recipe node.

### Requirement: mlspec-archive Skill

**Reason**: Auto-archive removed. Resolved experiments stay visible.

### Requirement: Skills Installed via openspec init

**Reason**: MLSpec skills are installed via `mlspec init --tools <tool>`, not `openspec init --tools <tool>`. OpenSpec and MLSpec are separate tools.
