# mlspec-workflow-skills Specification

## ADDED Requirements

### Requirement: Skill templates updated for V3 lifecycle

The system SHALL provide V3 skill templates that guide agents through the Prepare → Evidence Ladder → Resolve workflow.

#### Scenario: Skills are agent prompts, not CLI commands
- **WHEN** agent invokes a MLSpec skill
- **THEN** skill instructs agent to perform work and write artifacts
- **AND** skill does NOT assume CLI can invoke skills
- **AND** after writing artifacts, agent runs `mlspec validate` or `mlspec status` to check state

#### Scenario: Skill performs work, CLI validates
- **WHEN** agent uses a MLSpec skill
- **THEN** skill instructs agent to:
  1. Perform project-specific ML work (transforms, training, benchmarks)
  2. Write artifacts (prepare.md, evidence/<rung>.md, resolution.md)
  3. Run validation commands to verify work
- **AND** skill does NOT instruct CLI to invoke the skill

### Requirement: V3 Skill Inventory

The system SHALL provide these V3 skill templates:

#### Scenario: /mlspec-explore skill
- **WHEN** agent invokes /mlspec-explore
- **THEN** skill instructs agent to:
  - Explore workspace structure
  - Suggest experiment directions based on existing recipes and benchmarks
  - Recommend evidence ladder structure (rungs, budgets, baselines)

#### Scenario: /mlspec-propose skill
- **WHEN** agent invokes /mlspec-propose
- **THEN** skill instructs agent to:
  - Create experiment.yaml with proposed_recipe
  - Create hypothesis.md with mechanistic and practical hypotheses
  - Create protocol.md with evidence_ladder, compute_agreement, baseline_requirements
  - Prompt for ladder design (rungs, budgets, baselines)

#### Scenario: /mlspec-prepare skill
- **WHEN** agent invokes /mlspec-prepare
- **THEN** skill instructs agent to:
  - Verify transform implementation (if data_intervention exists)
  - Verify benchmark scripts functionality
  - Run training startup checks (≤100 steps)
  - Check baseline availability per rung
  - Write prepare.md with verification results
  - Set status=ready, needs_work, or protocol_change_required based on results

#### Scenario: /mlspec-run skill
- **WHEN** agent invokes /mlspec-run
- **THEN** skill instructs agent to:
  - Verify prepare.md status=ready before proceeding
  - Train baseline_arm if required (or use existing recipe)
  - Train treatment_arm
  - Run benchmark on both arms
  - Compute comparison metrics
  - Write evidence/<rung>.md with arm results and comparison
  - Run `mlspec validate` to verify schema

#### Scenario: /mlspec-resolve skill
- **WHEN** agent invokes /mlspec-resolve
- **THEN** skill instructs agent to:
  - Read evidence from can_resolve=true rung
  - Assess mechanistic_outcome (success|failure|inconclusive)
  - Assess practical_outcome (positive|negative|inconclusive|variant_accepted)
  - Handle variant_accepted case (mechanistic failure + practical positive)
  - Write resolution.md with separated outcomes
  - Run `mlspec validate` to verify schema

#### Scenario: /mlspec-next skill
- **WHEN** agent invokes /mlspec-next
- **THEN** skill instructs agent to:
  - Read experiment state and prepare.md status
  - Read protocol.md evidence_ladder
  - Determine next action: prepare (if not done), run evidence (for next rung), or resolve (if can_resolve rung has evidence)
  - Recommend specific command to run

### Requirement: Skill templates in src/core/templates/workflows/

The system SHALL store skill templates in TypeScript files that export get*SkillTemplate functions.

#### Scenario: Skill template structure
- **WHEN** agent invokes /mlspec-{name}
- **THEN** agent reads skill from `.opencode/skills/mlspec-{name}/SKILL.md`
- **AND** skill content comes from `src/core/templates/workflows/mlspec-{name}.ts` via installation
