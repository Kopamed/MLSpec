# mlspec-workflow-skills Specification

## Purpose

This capability provides MLSpec workflow skill templates and command generation for ML experimentation within the OpenSpec system. MLSpec skills enable AI agents to enter specific modes for each stage of the ML experimentation lifecycle (explore, propose, run, resolve, next).

## MODIFIED Requirements

### Requirement: MLSpec Skill Templates Use JSON CLI State

The MLSpec skill templates that inspect workspace state SHALL prefer JSON CLI commands as the primary state source, with fallback to file inspection.

#### Scenario: mlspec-next uses mlspec next --json first
- **WHEN** `/mlspec-next` skill is invoked
- **THEN** the skill SHALL run `mlspec next --json` as the primary routing signal
- **AND** if JSON output is available and parseable, the skill SHALL use the structured data
- **AND** if JSON command fails or output is unparseable, the skill SHALL fall back to file inspection

#### Scenario: mlspec-propose uses status --json for workspace detection
- **WHEN** `/mlspec-propose` skill is invoked
- **THEN** the skill SHALL run `mlspec status --json` to detect workspace state
- **AND** the skill SHALL use `recipes` array to detect empty workspace (bootstrap mode)
- **AND** the skill SHALL use `current_best_recipes` to detect single current-best or ambiguous multiple current-best recipes
- **AND** the skill SHALL use `experiments.by_status` to detect existing experiments and avoid duplicate IDs
- **AND** if JSON command fails, the skill SHALL fall back to file inspection

#### Scenario: mlspec-run uses status --experiment --json for pre-flight
- **WHEN** `/mlspec-run` skill is invoked for an experiment
- **THEN** the skill SHALL run `mlspec status --experiment <id> --json` before recording evidence
- **AND** the skill SHALL use `ready_to_resolve` and `missing_stages` from the JSON to determine next action
- **AND** if JSON command fails, the skill SHALL fall back to file inspection

#### Scenario: mlspec-resolve uses show evidence --json for pre-flight checks
- **WHEN** `/mlspec-resolve` skill is invoked for an experiment
- **THEN** the skill SHALL run `mlspec show evidence <experiment> --json` for pre-flight checks
- **AND** note that `mlspec status --experiment <id>` is JSON-only in 2.1.0; it returns a JSON error if `--json` is omitted
- **AND** the skill SHALL use evidence recommendations from the JSON to detect conflicts
- **AND** if JSON command fails, the skill SHALL fall back to reading evidence files directly

#### Scenario: mlspec-explore prefers JSON CLI state
- **WHEN** `/mlspec-explore` skill needs to inspect workspace state
- **THEN** the skill SHALL prefer `mlspec status --json` and `mlspec show recipe --json`
- **AND** if JSON commands fail, the skill SHALL fall back to file inspection

#### Scenario: Skills document fallback behavior
- **WHEN** a skill template uses JSON CLI commands
- **THEN** the skill instructions SHALL document the fallback to file inspection
- **AND** the fallback logic SHALL be functionally equivalent to the JSON parsing

---

### Requirement: MLSpec Skill Templates Remain Backward Compatible

Skill templates SHALL continue to function when JSON CLI commands are unavailable.

#### Scenario: mlspec-next works without JSON support
- **WHEN** `mlspec next --json` is not available or fails
- **THEN** `mlspec-next` skill SHALL fall back to file inspection
- **AND** the routing recommendations SHALL be functionally equivalent

#### Scenario: mlspec-propose works without JSON support
- **WHEN** `mlspec status --json` is not available or fails
- **THEN** `mlspec-propose` skill SHALL fall back to file inspection
- **AND** the workspace state detection SHALL be functionally equivalent

#### Scenario: mlspec-run works without JSON support
- **WHEN** `mlspec status --experiment <id> --json` is not available or fails
- **THEN** `mlspec-run` skill SHALL fall back to checking evidence files directly
- **AND** the skill SHALL determine missing stages by checking file existence

#### Scenario: mlspec-resolve works without JSON support
- **WHEN** `mlspec show evidence <experiment> --json` is not available or fails
- **THEN** `mlspec-resolve` skill SHALL fall back to reading evidence files directly
- **AND** the evidence conflict detection SHALL be functionally equivalent
