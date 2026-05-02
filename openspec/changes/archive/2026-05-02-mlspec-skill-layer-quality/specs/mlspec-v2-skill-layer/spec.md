# mlspec-v2-skill-layer Specification

This spec defines quality improvements to the MLSpec V2 skill layer.

## MODIFIED Requirements

### Requirement: mlspec-v2-skill-layer Author Metadata

The `mlspec-resolve` skill template MUST have correct author metadata.

**File:** `src/core/templates/workflows/mlspec-resolve.ts`

#### Scenario: mlspec-resolve has correct author
- **WHEN** `mlspec-resolve` skill template is used to generate a skill
- **THEN** the generated SKILL.md SHALL have `metadata.author: mlspec`
- **AND** SHALL NOT have `metadata.author: openspec`

---

### Requirement: mlspec Skills Have Pause Conditions

Each mutable MLSpec skill MUST define explicit pause conditions.

**Format:**
```
**Pause if:**
- <condition causing pause>
```

#### Scenario: mlspec-explore has pause conditions
- **WHEN** user requests file creation during `/mlspec-explore`
- **THEN** skill SHALL output: "Explore mode is read-only. Use /mlspec-propose to create experiments."
- **AND** SHALL pause

- **WHEN** user requests training execution during `/mlspec-explore`
- **THEN** skill SHALL output: "Explore mode is for analysis only. Use /mlspec-run to execute experiments."
- **AND** SHALL pause

#### Scenario: mlspec-propose has pause conditions
- **WHEN** context is genuinely ambiguous after inference
- **THEN** skill SHALL ask one clarifying question
- **AND** SHALL pause

- **WHEN** user wants to skip hypothesis definition
- **THEN** skill SHALL output: "A hypothesis is required for valid experiments."
- **AND** SHALL pause

- **WHEN** user wants to run training during proposal
- **THEN** skill SHALL output: "Training happens during /mlspec-run, not /mlspec-propose."
- **AND** SHALL pause

#### Scenario: mlspec-run has pause conditions
- **WHEN** evidence file already exists for the target stage
- **THEN** skill SHALL NOT attempt to record evidence
- **AND** SHALL output blocked state with overwrite/skip options

- **WHEN** base recipe has no metrics
- **THEN** skill SHALL output: "Cannot compare results without baseline metrics."
- **AND** SHALL pause

- **WHEN** user provides unclear or incomplete results
- **THEN** skill SHALL ask for clarification
- **AND** SHALL pause

#### Scenario: mlspec-resolve has pause conditions
- **WHEN** experiment status is 'resolved'
- **THEN** skill SHALL output: "Experiment '<id>' is already resolved."
- **AND** SHALL NOT proceed to resolution

- **WHEN** evidence contradicts itself across stages
- **THEN** skill SHALL flag the conflict
- **AND** SHALL pause asking how to proceed

---

### Requirement: mlspec Skills Have Structured Output Formats

Each MLSpec skill MUST define output for success and blocked states.

#### Scenario: mlspec-explore has success output format
- **WHEN** `/mlspec-explore` completes with workspace containing recipes
- **THEN** output SHALL include:
  - Current best recipe with metrics
  - Active experiments with evidence summaries
  - Identified opportunities
  - Next action recommendation

#### Scenario: mlspec-explore has blocked output format
- **WHEN** user requests file creation or training during `/mlspec-explore`
- **THEN** skill SHALL output blocked state explaining explore is read-only
- **AND** SHALL list valid next actions

#### Scenario: mlspec-propose has success output format
- **WHEN** `/mlspec-propose` completes experiment creation
- **THEN** output SHALL include:
  - Base and proposed recipes
  - Hypothesis (controlled variables, success criteria, abort criteria, evidence plan)
  - Next action recommendation

#### Scenario: mlspec-propose has blocked output format
- **WHEN** context is genuinely ambiguous
- **THEN** skill SHALL output blocked state with specific clarifying question
- **AND** SHALL list options for how to proceed

#### Scenario: mlspec-run has success output format
- **WHEN** `/mlspec-run` completes evidence recording
- **THEN** output SHALL include:
  - Per-run metrics table
  - Aggregate statistics
  - Comparison to base recipe
  - Recommendation
  - Next action recommendation

#### Scenario: mlspec-run has blocked output format for existing evidence
- **WHEN** evidence file already exists for the target stage
- **THEN** skill SHALL output:
  - "Evidence at stage '<stage>' already exists for experiment '<id>'"
  - **Options:**
    1. **Overwrite** - Delete existing evidence file and record new results
    2. **Skip** - Use existing evidence and take no action
    3. **Cancel** - Stop and use /mlspec-next to find other actions

#### Scenario: mlspec-resolve has success output format
- **WHEN** `/mlspec-resolve` completes resolution
- **THEN** output SHALL include:
  - Resolution type
  - Created recipe (if accept)
  - Supporting evidence summary
  - Next action recommendation

#### Scenario: mlspec-resolve has blocked output for already resolved
- **WHEN** experiment status is 'resolved'
- **THEN** skill SHALL output:
  - "Experiment '<id>' is already resolved"
  - Reference to existing resolution
  - Suggested alternative actions

#### Scenario: mlspec-resolve has blocked output for evidence conflict
- **WHEN** evidence stages have conflicting recommendations
- **THEN** skill SHALL output:
  - Evidence conflict summary (per-stage recommendations)
  - **Options:**
    1. **Proceed anyway** - Accept with user-provided rationale
    2. **Collect more evidence** - Run /mlspec-run to clarify
    3. **Cancel** - Stop and reconsider

#### Scenario: mlspec-next has success output format
- **WHEN** `/mlspec-next` provides routing
- **THEN** output SHALL include:
  - Recommended action
  - Why this action
  - Context (current best, active experiments)
  - Alternative actions

---

### Requirement: mlspec-run Evidence Handling

The `mlspec-run` skill MUST warn about existing evidence behavior.

#### Scenario: mlspec-run checks for existing evidence
- **WHEN** user runs `/mlspec-run` for a stage
- **THEN** skill SHALL check if `mlspec/experiments/<id>/evidence/<stage>.md` exists

#### Scenario: mlspec-run fails if evidence exists
- **WHEN** evidence file already exists for the target stage
- **THEN** skill SHALL output blocked state
- **AND** SHALL NOT call `mlspec add-evidence`

#### Scenario: mlspec-run handles overwrite choice
- **WHEN** user chooses "Overwrite" from blocked state
- **THEN** skill SHALL:
  1. Delete the existing evidence file
  2. Record new evidence (run training or use CLI)
  3. Write new evidence file

#### Scenario: mlspec-run handles skip choice
- **WHEN** user chooses "Skip" from blocked state
- **THEN** skill SHALL take no action
- **AND** SHALL suggest /mlspec-next for other actions

---

### Requirement: mlspec-resolve Pre-flight Checks

The `mlspec-resolve` skill MUST check experiment status before attempting resolution.

#### Scenario: mlspec-resolve checks experiment status
- **WHEN** `/mlspec-resolve` is invoked
- **THEN** skill SHALL read `mlspec/experiments/<id>/experiment.yaml`
- **AND** SHALL check the `status` field

#### Scenario: mlspec-resolve blocks already resolved experiments
- **WHEN** experiment status is 'resolved'
- **THEN** skill SHALL output "Experiment '<id>' is already resolved"
- **AND** SHALL NOT proceed to resolution
- **AND** SHALL suggest /mlspec-next

#### Scenario: mlspec-resolve warns on no evidence
- **WHEN** experiment has no evidence files
- **THEN** skill SHALL output warning: "No evidence recorded"
- **AND** SHALL allow user to confirm or cancel

#### Scenario: mlspec-resolve detects evidence conflicts
- **WHEN** evidence stages have contradictory recommendations
- **THEN** skill SHALL flag the conflict
- **AND** SHALL pause asking how to proceed

---

### Requirement: mlspec-next Uses CLI-First Routing

The `mlspec-next` skill SHOULD use `mlspec next` CLI as the primary routing signal.

#### Scenario: mlspec-next calls CLI first
- **WHEN** user runs `/mlspec-next`
- **THEN** skill SHALL first attempt to run `mlspec next` CLI
- **AND** SHALL parse the human-readable output for suggested actions

#### Scenario: mlspec-next falls back to file inspection
- **WHEN** `mlspec next` CLI fails or output is unclear
- **THEN** skill SHALL fall back to direct file inspection
- **AND** SHALL apply the documented priority ordering

#### Scenario: mlspec-next priority ordering
- **WHEN** CLI is unavailable and file inspection is needed
- **THEN** skill SHALL apply this priority:
  1. Abort criteria met → /mlspec-resolve reject
  2. Complete evidence + recommendation → /mlspec-resolve
  3. Smoke complete, no validation → /mlspec-run validation
  4. Draft, no evidence → /mlspec-run smoke
  5. Validation complete, no final → /mlspec-run final
  6. No clear action → /mlspec-explore

---

### Requirement: mlspec Command Files Remain Consistent

The MLSpec command files (`.opencode/commands/*.md`) SHALL remain consistent with improved skills.

#### Scenario: mlspec command files have pause conditions
- **WHEN** a command file contains operational instructions
- **THEN** it SHALL include pause conditions matching the skill
- **AND** it SHALL include blocked state handling

#### Scenario: mlspec command files route to improved skills
- **WHEN** user invokes a command
- **THEN** the command file SHALL route to the corresponding skill
- **AND** the skill's improved operational behavior SHALL apply
