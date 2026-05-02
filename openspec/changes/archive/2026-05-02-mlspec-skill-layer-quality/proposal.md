## Why

MLSpec V2 skills were generated with conceptual correctness but weak operational instructions. Comparing against OpenSpec's more mature skill designs reveals concrete gaps:

1. **Branding leak**: `mlspec-resolve` template has `metadata.author: "openspec"` instead of `"mlspec"`
2. **No pause conditions**: Agents don't know when to stop and ask
3. **No blocked state handling**: Skills don't define what to do when they can't proceed
4. **Misleading evidence handling**: `mlspec-run` suggests evidence can be recorded, but CLI fails if evidence exists and agent must handle overwrite/skip explicitly
5. **Missing pre-flight checks**: `mlspec-resolve` doesn't check if experiment is already resolved
6. **Routing inefficiency**: `mlspec-next` does its own file inspection instead of using `mlspec next` CLI first

These are quality issues in the existing V2 skill templates, not new features.

## What Changes

This change MODIFIES the existing `mlspec-v2-skill-layer` capability.

### 1. Fix mlspec-resolve author metadata

**File:** `src/core/templates/workflows/mlspec-resolve.ts` line 155

Change `metadata.author: "openspec"` to `metadata.author: "mlspec"`.

This ensures generated SKILL.md files have correct branding.

### 2. Add pause conditions to all MLSpec skills

Each skill receives explicit `**Pause if:**` sections defining when the agent should stop and ask rather than proceeding.

### 3. Add blocked state output formats to all MLSpec skills

Each skill defines structured output for blocked states:
- **Blocked**: Why blocked + options + ask user

### 4. Fix mlspec-run evidence handling

**Current behavior:** Skill suggests `mlspec add-evidence` can record evidence without warning.

**Actual behavior:** CLI fails with "Evidence at stage 'X' already exists".

**Fix:**
- Skill checks for existing evidence before recording
- If evidence exists: output blocked state with options:
  - "Overwrite" — agent must delete existing file then record new evidence
  - "Skip" — take no action, suggest /mlspec-next
  - "Cancel" — stop
- No append support (would require separate CLI implementation)

### 5. Add mlspec-resolve pre-flight checks

Before attempting resolution:
- Check `experiment.yaml` status field
- If `status === 'resolved'`: output blocked state, do not proceed
- Check evidence exists (warn if none)
- Check for evidence conflicts (contradictory recommendations across stages)

### 6. Update mlspec-next to use CLI first

**Current:** Skill does file inspection logic directly.

**Fix:** Skill calls `mlspec next` CLI as first routing signal. Falls back to file inspection only if CLI fails or output is unclear.

### 7. Update corresponding command files

The short command files (`.opencode/commands/*.md`) are generated separately from skill files. They are thin wrappers that route to skills. They will be verified to ensure consistency with improved skill behavior.

## Capabilities

### Modified Capabilities

- `mlspec-v2-skill-layer`: MODIFIED to add operational hardening

## Impact

- `src/core/templates/workflows/mlspec-resolve.ts` — fix author metadata, add pause conditions, add blocked output formats, add pre-flight checks
- `src/core/templates/workflows/mlspec-explore.ts` — add pause conditions, add blocked output formats
- `src/core/templates/workflows/mlspec-propose.ts` — add pause conditions, add blocked output formats
- `src/core/templates/workflows/mlspec-run.ts` — add pause conditions, fix evidence handling, add blocked output formats
- `src/core/templates/workflows/mlspec-next.ts` — add CLI-first routing, add pause conditions, add output formats

Corresponding command template functions in same files will be verified for consistency.

## Out of Scope

- New CLI commands (JSON output, `mlspec instructions`, etc.)
- Changes to shared `skill-generation.ts` fallback author (shared by OpenSpec and MLSpec)
- Bootstrap workflow changes (shipped in V2)
- Evidence append support (would require separate CLI implementation)
- New unit tests (verification is via build, init smoke test, generated skill/command inspection, npm test)
