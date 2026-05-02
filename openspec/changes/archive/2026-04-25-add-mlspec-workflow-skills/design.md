## Context

OpenSpec provides workflow skills and commands for software engineering tasks (explore, propose, apply, archive). MLSpec provides CLI commands for ML experimentation (`openspec ml init`, `openspec ml new experiment`, etc.) and agent protocol documentation (`mlspec/AGENTS.md`).

OpenSpec's skill/template system has two output targets:
1. **Skills**: Go to each tool's `skillsDir` (e.g., `.claude/skills/`, `.opencode/skills/`)
2. **Commands**: Go to tool-specific paths via adapters (e.g., `.claude/commands/opsx/`, `.opencode/commands/`)

Both targets are generated from the same template source, differentiated only by adapter formatting.

## Goals / Non-Goals

**Goals:**
- Add MLSpec workflows to the OpenSpec template system
- Generate MLSpec skills for all configured tools with `skillsDir`
- Generate MLSpec commands for all configured tools with adapters
- Preserve OpenCode's `mlspec-*.md` command filename convention (exception to the `opsx-*` pattern)
- Ensure existing OpenSpec SWE workflow generation is unaffected

**Non-Goals:**
- Do not modify MLSpec CLI commands or entity schemas
- Do not modify `mlspec/AGENTS.md`
- Do not add MLSpec-specific tool adapters (reuse existing adapter infrastructure)
- Do not require identical filenames across all tools

## Decisions

### Decision 1: MLSpec Workflow IDs

**Choice:** Add six new workflow IDs to `ALL_WORKFLOWS`:
- `mlspec-explore`
- `mlspec-propose-experiment`
- `mlspec-run-evidence`
- `mlspec-decide`
- `mlspec-promote`
- `mlspec-archive`

**Rationale:** Follows the existing naming pattern for OpenSpec workflows (e.g., `openspec-explore`, `openspec-apply-change`).

### Decision 2: MLSpec Skill Directory Names

**Choice:** `WORKFLOW_TO_SKILL_DIR` entries map workflow ID to same name:
```typescript
'mlspec-explore': 'mlspec-explore',
'mlspec-propose-experiment': 'mlspec-propose-experiment',
// etc.
```

**Rationale:** Skills will be installed at `<skillsDir>/skills/mlspec-explore/SKILL.md` for all tools.

### Decision 3: OpenCode Adapter Exception for MLSpec Commands

**Choice:** OpenCode adapter emits `mlspec-*.md` filenames for MLSpec commands.

**Implementation:**
```typescript
// In opencode adapter
getFilePath(commandId: string): string {
  if (commandId.startsWith('mlspec-')) {
    return path.join('.opencode', 'commands', `${commandId}.md`);
  }
  return path.join('.opencode', 'commands', `opsx-${commandId}.md`);
}
```

**Rationale:** OpenCode is the primary target for MLSpec skills. Using `mlspec-*.md` filenames is more readable and consistent with the skill naming.

### Decision 4: Template Location

**Choice:** Six new template modules under `src/core/templates/workflows/`:
- `mlspec-explore.ts`
- `mlspec-propose-experiment.ts`
- `mlspec-run-evidence.ts`
- `mlspec-decide.ts`
- `mlspec-promote.ts`
- `mlspec-archive.ts`

**Rationale:** Follows existing pattern. Each module exports both a `SkillTemplate` (for skills) and `CommandTemplate` (for commands), ensuring content stays in sync.

### Decision 5: Skill Name Prefix

**Choice:** Use `mlspec-` prefix for skill directory names and command IDs.

**Rationale:** Distinct from OpenSpec's `openspec-` prefix. Clear separation between SWE and MLSpec workflows.

## Skills vs Commands Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  MLSpec Template Module (e.g., mlspec-explore.ts)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  getMlspecExploreSkillTemplate() → SkillTemplate                │
│       │                                                         │
│       └── Used for: <skillsDir>/skills/mlspec-explore/SKILL.md │
│                                                                  │
│  getMlspecExploreCommandTemplate() → CommandTemplate           │
│       │                                                         │
│       └── Used for: command files via adapters                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Generation per Tool                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  For tool with skillsDir:                                       │
│    generateSkillContent(template) → SKILL.md                    │
│    Output: <skillsDir>/skills/mlspec-explore/SKILL.md          │
│                                                                  │
│  For tool with adapter:                                         │
│    adapter.formatFile(commandContent) → command file            │
│    OpenCode: .opencode/commands/mlspec-explore.md              │
│    Claude: .claude/commands/opsx/mlspec-explore.md             │
│    Cursor: .cursor/commands/opsx-mlspec-explore.md             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/core/templates/workflows/mlspec-explore.ts` | Explore skill + command templates |
| `src/core/templates/workflows/mlspec-propose-experiment.ts` | Propose skill + command templates |
| `src/core/templates/workflows/mlspec-run-evidence.ts` | Run-evidence skill + command templates |
| `src/core/templates/workflows/mlspec-decide.ts` | Decide skill + command templates |
| `src/core/templates/workflows/mlspec-promote.ts` | Promote skill + command templates |
| `src/core/templates/workflows/mlspec-archive.ts` | Archive skill + command templates |

## Files to Modify

| File | Change |
|------|--------|
| `src/core/profiles.ts` | Add 6 MLSpec workflows to `ALL_WORKFLOWS` |
| `src/core/profile-sync-drift.ts` | Add `WORKFLOW_TO_SKILL_DIR` entries |
| `src/core/templates/skill-templates.ts` | Export new MLSpec templates |
| `src/core/shared/tool-detection.ts` | Add MLSpec skill names to `SKILL_NAMES` |
| `src/core/command-generation/adapters/opencode.ts` | Handle `mlspec-*` command ID naming |
| `src/core/shared/skill-generation.ts` | MLSpec templates auto-included (no changes needed) |

## Skills Generated Per Tool

For each configured tool with `skillsDir`:
```
<skillsDir>/skills/mlspec-explore/SKILL.md
<skillsDir>/skills/mlspec-propose-experiment/SKILL.md
<skillsDir>/skills/mlspec-run-evidence/SKILL.md
<skillsDir>/skills/mlspec-decide/SKILL.md
<skillsDir>/skills/mlspec-promote/SKILL.md
<skillsDir>/skills/mlspec-archive/SKILL.md
```

## Commands Generated Per Tool

| Tool | Output Path |
|------|-------------|
| OpenCode | `.opencode/commands/mlspec-*.md` |
| Claude | `.claude/commands/opsx/mlspec-*.md` |
| Cursor | `.cursor/commands/opsx-mlspec-*.md` |
| Windsurf | `.windsurf/workflows/opsx-mlspec-*.md` |
| (others) | Via respective adapters |

## Root `.opencode` Files

The root `.opencode/skills/mlspec-*/` and `.opencode/commands/mlspec-*.md` files are **installed/example output**, not canonical source.

**Canonical source:** `src/core/templates/workflows/mlspec-*.ts`

These files are kept for self-use/testing but:
- Are **not** the canonical source of truth
- May diverge from templates over time
- Should be regenerated or checked against templates to avoid drift
- If removed, `openspec init --tools opencode` with MLSpec workflows will regenerate them from templates

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| OpenCode adapter modification breaks other workflows | Only add conditional for `mlspec-*` prefix, keep existing logic for other IDs |
| Template content drift | Same source file exports both SkillTemplate and CommandTemplate |
| Tool adapter incompatibility | Existing adapters handle all current tools; MLSpec uses same CommandTemplate structure |

## Open Questions

None for MVP.
