## Why

MLSpec has CLI commands (`openspec ml *`) and agent protocol documentation (`mlspec/AGENTS.md`), but lacks corresponding OpenCode skill files. Without MLSpec-specific skills, agents fall back to raw CLI usage at exactly the points where lifecycle discipline matters most.

## What Changes

- Add six MLSpec workflow skill templates under `src/core/templates/workflows/mlspec-*.ts`
- Add MLSpec workflows to `ALL_WORKFLOWS` in `src/core/profiles.ts`
- Add MLSpec skill directory names to `WORKFLOW_TO_SKILL_DIR` in `src/core/profile-sync-drift.ts`
- Add MLSpec skill names to `SKILL_NAMES` in `src/core/shared/tool-detection.ts`
- Export MLSpec templates from `src/core/templates/skill-templates.ts`
- Add OpenCode adapter exception to emit MLSpec commands with `mlspec-*.md` naming (not `opsx-mlspec-*.md`)
- Generate MLSpec skills for all configured tools that have `skillsDir`
- Generate MLSpec commands for all configured tools that have adapters

## Capabilities

### New Capabilities

- `mlspec-workflow-skills`: Six MLSpec workflow skill templates (mlspec-explore, mlspec-propose-experiment, mlspec-run-evidence, mlspec-decide, mlspec-promote, mlspec-archive) that enable agents to enter specific modes for each stage of the ML experimentation lifecycle

### Modified Capabilities

None. This change adds new workflow templates without modifying existing MLSpec CLI behavior.

## Impact

- New files: 6 template modules in `src/core/templates/workflows/`
- Modified files: `profiles.ts`, `profile-sync-drift.ts`, `tool-detection.ts`, `skill-templates.ts`
- OpenCode adapter: modified to emit `mlspec-*.md` filenames for MLSpec commands
- Testing: new integration tests for MLSpec skill generation
