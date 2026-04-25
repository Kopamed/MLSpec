## Context

OpenSpec provides an agent skill system under `.opencode/skills/` with SKILL.md files. Each skill gives agents a distinct mode with specific behavior, input handling, steps, outputs, and guardrails. Existing skills cover the OpenSpec change lifecycle:

- `openspec-explore` — Think through ideas
- `openspec-propose` — Propose new changes
- `openspec-apply-change` — Implement tasks
- `openspec-archive-change` — Archive completed changes

MLSpec provides CLI commands (`openspec ml *`) for the ML experimentation lifecycle but has no corresponding agent skills. Agents using MLSpec must either:
1. Read `mlspec/AGENTS.md` for protocol guidance (passive)
2. Invoke raw CLI commands (no lifecycle guardrails)

This design adds active skill modes for MLSpec workflows.

## Goals / Non-Goals

**Goals:**
- Give agents distinct modes for each MLSpec lifecycle stage
- Enforce explicit handoff between lifecycle stages (no auto-advance)
- Prevent lifecycle skipping (e.g., decide → promote → archive without gaps)
- Provide clear guardrails for what each skill must/must not do
- Complement `mlspec/AGENTS.md` with actionable skill instructions

**Non-Goals:**
- Do not add new CLI commands (skills wrap existing commands)
- Do not modify MLSpec validation or entity schemas
- Do not replace `mlspec/AGENTS.md` — skills complement it
- Do not add training runners, W&B integration, or experiment tracking
- Do not make skills Claude-specific — OpenCode generic

## Decisions

### Decision 1: Six skills covering full lifecycle

**Choice:** Create six skills: explore, propose-experiment, run-evidence, decide, promote, archive

**Rationale:** The MLSpec lifecycle has six stages. A skill per stage ensures:
- Agents enter correct mode for each action
- Guardrails prevent stage-skipping
- Explicit handoff between stages

**Alternatives considered:**
- 4 skills (explore + propose + run-evidence + decide) — rejected because promote/archive are critical lifecycle gates that need skill-mode guardrails
- 12 skills (separate E1/E2/E3 evidence skills) — rejected as over-granular; one `run-evidence` skill accepts `--level` parameter

### Decision 2: Explicit handoff over auto-advance

**Choice:** Each skill ends by recommending next steps and waiting for explicit user/agent invocation

**Rationale:**
- ML experimentation benefits from human reflection between stages
- Agents should not auto-promote or auto-archive without confirmation
- Explicit handoff allows pivoting to explore before running evidence

**Example output after `mlspec-propose-experiment`:**
```
✓ Experiment 'roi-cropping' created with hypothesis.md

Next step options:
1. Run E1 evidence now (mlspec-run-evidence)
2. Explore alternative approaches first (mlspec-explore)
3. Edit hypothesis before proceeding

What would you like to do?
```

### Decision 3: Skill naming follows existing pattern

**Choice:** Skill directories use `mlspec-<verb-phrase>/SKILL.md`, command files use `mlspec-<verb-phrase>.md`

**Rationale:** Existing skills use `openspec-<verb-phrase>/SKILL.md`. MLSpec skills follow the same pattern with `mlspec-` prefix. Command files (for slash commands) duplicate skill content as flat `.md` files.

### Decision 4: No new CLI commands

**Choice:** Skills wrap existing `openspec ml *` commands

**Rationale:**
- MLSpec CLI is complete for the lifecycle
- Skills provide orchestration and guardrails, not new functionality
- No changes to `src/mlspec/cli.ts` required

### Decision 5: Guardrails matrix

| Skill | Must Do | Must NOT Do |
|-------|---------|-------------|
| `mlspec-explore` | Read workspace, inspect code/data | Run training, modify code |
| `mlspec-propose-experiment` | Define comparison_ref, success/abort criteria, evidence plan | Run training, auto-invoke evidence |
| `mlspec-run-evidence` | Confirm intended change, record commands.executed, save outputs | Decide, promote |
| `mlspec-decide` | Read all evidence, distinguish proves vs does-not-prove | Promote |
| `mlspec-promote` | Verify decision=promote, verify target exists | Archive |
| `mlspec-archive` | Verify decision exists, verify promote happened if applicable | Promote |

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Agents ignore skills and use raw CLI | Skills are discoverable and named for common actions |
| Skill content diverges from CLI behavior | Skills reference exact CLI commands |
| Users forget to run skills in sequence | Skills output recommended next steps |

## Skill Architecture

### File Structure

```
.opencode/
├── skills/
│   ├── mlspec-explore/
│   │   └── SKILL.md          ← skill for agent skill system
│   ├── mlspec-propose-experiment/
│   │   └── SKILL.md
│   ├── mlspec-run-evidence/
│   │   └── SKILL.md
│   ├── mlspec-decide/
│   │   └── SKILL.md
│   ├── mlspec-promote/
│   │   └── SKILL.md
│   └── mlspec-archive/
│       └── SKILL.md
│
└── commands/
    ├── mlspec-explore.md            ← duplicate for slash commands
    ├── mlspec-propose-experiment.md
    ├── mlspec-run-evidence.md
    ├── mlspec-decide.md
    ├── mlspec-promote.md
    └── mlspec-archive.md
```

### Frontmatter Schema

Each skill file has YAML frontmatter:

```yaml
---
name: <skill-name>           # matches directory name
description: <brief description>  # triggers skill selection
license: MIT
compatibility: Requires openspec CLI and MLSpec workspace
metadata:
  author: openspec
  version: "1.0"
---
```

### Lifecycle Enforcement

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ mlspec-     │────▶│ mlspec-          │────▶│ mlspec-         │
│ explore     │     │ propose-experiment│     │ run-evidence   │
└─────────────┘     └──────────────────┘     └─────────────────┘
                                                      │
                                                      ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ mlspec-     │◀────│ mlspec-          │◀────│ mlspec-         │
│ archive     │     │ decide           │     │ promote         │
└─────────────┘     └─────────────────┘     └─────────────────┘

Each arrow = explicit handoff (skill asks before next step)
```

## Open Questions

None for MVP. Future considerations:
- Should `mlspec-run-evidence` support non-local outputs (W&B, cloud paths)?
- Should `mlspec-status` skill exist for querying protocol state?
- Should skills support `--json` output for programmatic use?
