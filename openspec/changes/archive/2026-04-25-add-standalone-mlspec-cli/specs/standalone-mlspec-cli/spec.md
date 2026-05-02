## ADDED Requirements

### Requirement: Standalone mlspec binary
The system SHALL provide a standalone `mlspec` binary entry point that is separate from the `openspec` binary.

#### Scenario: mlspec binary is executable
- **WHEN** user runs `mlspec --help`
- **THEN** the system displays MLSpec-specific help output showing only MLSpec commands

#### Scenario: mlspec binary shows MLSpec commands
- **WHEN** user runs `mlspec --help`
- **THEN** the system shows commands: `init`, `update`, `status`, `validate`, `new`, `add-evidence`, `decide`, `promote`, `archive`

---

### Requirement: mlspec init creates MLSpec workspace
The `mlspec init` command SHALL create or refresh the `mlspec/` workspace directory with required subdirectories and files.

#### Scenario: mlspec init creates workspace files
- **WHEN** user runs `mlspec init` in a project without `mlspec/` directory
- **THEN** the system creates the `mlspec/` workspace with `evaluation.md`, `AGENTS.md`, `.workspace.yaml`, and subdirectories: `baselines/`, `experiments/`, `candidates/`, `findings/`, `archive/`

#### Scenario: mlspec init refreshes existing workspace
- **WHEN** user runs `mlspec init` in a project with existing `mlspec/` directory
- **THEN** the system refreshes the workspace by updating `evaluation.md` and `AGENTS.md` while preserving existing baselines, experiments, and candidates

#### Scenario: mlspec init --no-tools skips tool installation
- **WHEN** user runs `mlspec init --no-tools`
- **THEN** the system creates the `mlspec/` workspace but does not install any tool integrations

#### Scenario: mlspec init shows MLSpec welcome messaging
- **WHEN** user runs `mlspec init` in interactive mode
- **THEN** the system displays MLSpec-specific welcome/setup messaging (not OpenSpec/SWE messaging)

---

### Requirement: mlspec init --tools installs MLSpec skills
The `mlspec init --tools <tool>` command SHALL install MLSpec workflow skills and commands for the specified AI tool.

#### Scenario: mlspec init --tools opencode installs MLSpec skills
- **WHEN** user runs `mlspec init --tools opencode`
- **THEN** the system creates the `mlspec/` workspace AND installs MLSpec skills to `.opencode/skills/mlspec-*/SKILL.md` and MLSpec commands to `.opencode/commands/mlspec-*.md`

#### Scenario: mlspec init --tools installs only MLSpec workflows
- **WHEN** user runs `mlspec init --tools <tool>`
- **THEN** the system installs ONLY the 6 MLSpec workflows (mlspec-explore, mlspec-propose-experiment, mlspec-run-evidence, mlspec-decide, mlspec-promote, mlspec-archive) and does NOT install OpenSpec SWE workflows (openspec-propose, openspec-explore, etc.)

#### Scenario: mlspec init --tools opencode creates .opencode directory if missing
- **WHEN** user runs `mlspec init --tools opencode` and `.opencode/` does not exist
- **THEN** the system creates the `.opencode/` directory structure as needed for tool integrations

---

### Requirement: mlspec update refreshes MLSpec integrations
The `mlspec update` command SHALL refresh MLSpec skills, commands, and protocol files for an existing MLSpec project.

#### Scenario: mlspec update refreshes all configured tools
- **WHEN** user runs `mlspec update` in a project with existing MLSpec integrations
- **THEN** the system refreshes MLSpec skills and commands for all tools that have MLSpec skills installed

#### Scenario: mlspec update --tools opencode refreshes specific tool
- **WHEN** user runs `mlspec update --tools opencode`
- **THEN** the system refreshes MLSpec skills and commands for OpenCode only

#### Scenario: mlspec update fails without workspace
- **WHEN** user runs `mlspec update` in a project without `mlspec/` workspace
- **THEN** the system fails with error: `No mlspec/ workspace found. Run 'mlspec init' first.`

---

### Requirement: mlspec status shows MLSpec workspace status
The `mlspec status` command SHALL display the status of the MLSpec workspace.

#### Scenario: mlspec status shows experiment counts
- **WHEN** user runs `mlspec status`
- **THEN** the system displays counts and listings for baselines, candidates, active experiments (grouped by protocol state), and archived experiments

---

### Requirement: mlspec validate validates MLSpec workspace
The `mlspec validate` command SHALL validate the MLSpec workspace structure and entities.

#### Scenario: mlspec validate passes for valid workspace
- **WHEN** user runs `mlspec validate` on a valid MLSpec workspace
- **THEN** the system passes validation and reports no errors

#### Scenario: mlspec validate --strict treats warnings as errors
- **WHEN** user runs `mlspec validate --strict`
- **THEN** the system treats all warnings as errors and fails if any are found

---

### Requirement: MLSpec experiment commands work through standalone CLI
The `mlspec new`, `mlspec add-evidence`, `mlspec decide`, `mlspec promote`, and `mlspec archive` commands SHALL work through the standalone `mlspec` binary or its command layer.

#### Scenario: mlspec new experiment creates experiment
- **WHEN** user runs `mlspec new experiment my-exp`
- **THEN** the system creates `mlspec/experiments/my-exp/` with `.experiment.yaml` and `hypothesis.md`

#### Scenario: mlspec new baseline creates baseline
- **WHEN** user runs `mlspec new baseline my-baseline`
- **THEN** the system creates `mlspec/baselines/my-baseline/` with `.baseline.yaml` and `baseline.md`

#### Scenario: mlspec new candidate creates candidate
- **WHEN** user runs `mlspec new candidate my-candidate`
- **THEN** the system creates `mlspec/candidates/my-candidate/` with `.candidate.yaml` and `recipe-v1.yaml`

#### Scenario: mlspec add-evidence adds evidence level
- **WHEN** user runs `mlspec add-evidence my-exp --level E1`
- **THEN** the system creates `mlspec/experiments/my-exp/evidence/E1.md` with evidence frontmatter and template

#### Scenario: mlspec decide creates decision
- **WHEN** user runs `mlspec decide my-exp --decision promote --target-candidate my-candidate`
- **THEN** the system creates `mlspec/experiments/my-exp/decision.md` with promote decision

#### Scenario: mlspec promote creates candidate version
- **WHEN** user runs `mlspec promote my-exp --to my-candidate`
- **THEN** the system creates a new version in `mlspec/candidates/my-candidate/` based on the experiment

#### Scenario: mlspec archive moves experiment to archive
- **WHEN** user runs `mlspec archive my-exp`
- **THEN** the system moves the experiment directory to the appropriate archive subdirectory based on decision

---

### Requirement: openspec ml remains compatible
The `openspec ml ...` commands SHALL continue to work as compatibility aliases.

#### Scenario: openspec ml init still works
- **WHEN** user runs `openspec ml init`
- **THEN** the system creates the `mlspec/` workspace (as before this change)

#### Scenario: openspec ml status still works
- **WHEN** user runs `openspec ml status`
- **THEN** the system displays MLSpec workspace status

---

### Requirement: openspec init remains OpenSpec/SWE setup
The `openspec init` command SHALL continue to install OpenSpec/SWE skills and commands, not MLSpec skills.

#### Scenario: openspec init installs only OpenSpec SWE workflows
- **WHEN** user runs `openspec init --tools opencode`
- **THEN** the system installs only OpenSpec SWE workflows (openspec-propose, openspec-explore, etc.) and does NOT install MLSpec workflows

#### Scenario: openspec init does not create mlspec/ workspace
- **WHEN** user runs `openspec init`
- **THEN** the system does NOT create the `mlspec/` workspace
