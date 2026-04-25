## Why

OpenSpec has an agent skill system (`.opencode/skills/`) that gives agents active modes for different workflows (explore, propose, apply-change, archive-change). MLSpec has CLI commands for the ML experimentation lifecycle but lacks corresponding agent skills. Without MLSpec-specific skills, agents fall back to raw CLI usage at exactly the points where lifecycle discipline matters most.

## What Changes

- Add six new OpenCode skill files for MLSpec workflows:
  - `mlspec-explore` — Thinking mode for ML experiment ideas
  - `mlspec-propose-experiment` — Create experiment with hypothesis
  - `mlspec-run-evidence` — Run one evidence level
  - `mlspec-decide` — Write decision from evidence
  - `mlspec-promote` — Promote experiment to candidate
  - `mlspec-archive` — Archive decided experiment
- Each skill gets both a `SKILL.md` file (skill directory) and a `.md` command file (slash command)
- Skills enforce explicit handoff: no auto-advance between lifecycle stages
- Skills complement `mlspec/AGENTS.md` (persistent protocol) with active mode instructions

## Capabilities

### New Capabilities

This change adds a specification for MLSpec OpenCode skills, but does not modify runtime CLI behavior or existing MLSpec workflow behavior.

### Modified Capabilities

None. This change adds skill files only; it does not modify existing OpenSpec or MLSpec behavior.

## Impact

- New files: 12 skill/command Markdown files in `.opencode/skills/` and `.opencode/commands/`
- No changes to CLI commands, schemas, or validation logic
- No changes to `mlspec/AGENTS.md`
- Testing: validate skill files exist, frontmatter is correct, guardrail phrases present
