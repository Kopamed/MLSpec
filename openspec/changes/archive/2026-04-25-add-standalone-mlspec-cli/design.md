## Context

MLSpec workflows (mlspec-explore, mlspec-propose-experiment, mlspec-run-evidence, mlspec-decide, mlspec-promote, mlspec-archive) are currently accessible only through `openspec ml ...` as a subcommand of the OpenSpec CLI. This bundles MLSpec functionality with OpenSpec/SWE setup, which creates UX confusion: users who want MLSpec experiment management must first run OpenSpec setup, even if they don't want OpenSpec/SWE workflows.

The MLSpec system has its own:
- Workspace structure (`mlspec/`)
- Protocol files (`mlspec/AGENTS.md`, `mlspec/evaluation.md`)
- Experiment lifecycle (baseline → experiment → candidate)

The standalone `mlspec` CLI provides a focused entry point for MLSpec users without requiring OpenSpec/SWE setup.

## Goals / Non-Goals

**Goals:**
- Provide standalone `mlspec` binary as a focused entry point for MLSpec experiment management
- MLSpec init creates/refreshes `mlspec/` workspace with evaluation.md and AGENTS.md
- MLSpec init optionally installs MLSpec skills/commands for AI tools (via `--tools`)
- MLSpec update refreshes MLSpec integrations for existing projects
- Clear separation: `mlspec init` ≠ `openspec init` (MLSpec setup ≠ OpenSpec/SWE setup)
- `openspec ml ...` remains functional as a compatibility alias

**Non-Goals:**
- Do NOT modify `openspec init` behavior (remains OpenSpec/SWE setup only)
- Do NOT remove `openspec ml ...` compatibility (kept as alias)
- Do NOT change MLSpec protocol files (AGENTS.md, entity schemas)
- Do NOT change MLSpec workflow templates (already exist in `src/core/templates/workflows/mlspec-*.ts`)
- Do NOT create separate MLSpec skill directories (install to tool's standard skillsDir)

## Decisions

### 1. Separate binary entry point

**Decision:** Create `src/mlspec/cli/` as the MLSpec CLI module, with `src/mlspec/index.ts` as the binary entry point registered in `package.json`.

**Rationale:** Clean separation between `mlspec` and `openspec` binaries. Users who want MLSpec don't need to install or think about OpenSpec. Each binary has its own welcome text, help output, and command structure.

**Alternatives considered:**
- Single binary with `mlspec` subcommand: Would still require `openspec ml init` pattern; doesn't provide clean separation
- Plugin system: Over-engineered for this use case

### 2. CLI command structure

**Decision:** The `mlspec` CLI provides these commands:
```
mlspec init [--tools ...] [--no-tools]
mlspec update [--tools ...]
mlspec status
mlspec validate
mlspec new baseline <name>
mlspec new candidate <name>
mlspec new experiment <name>
mlspec add-evidence <experiment> --level <level>
mlspec decide <experiment> --decision <decision> [--target-candidate <name>]
mlspec promote <experiment> --to <candidate>
mlspec archive <experiment>
```

**Rationale:** Mirrors the existing `openspec ml` subcommand structure. Experiment management commands reuse existing implementations from `src/mlspec/cli.ts` (registerMlspecCommand). Init and update are MLSpec-specific new commands.

### 3. MLSpec init behavior

**Decision:** `mlspec init` creates/refreshes `mlspec/` workspace:
- Creates `mlspec/evaluation.md` (or refreshes if exists)
- Creates `mlspec/AGENTS.md` (or refreshes if exists)
- Creates `mlspec/.workspace.yaml`
- Creates required subdirectories: `baselines/`, `experiments/`, `candidates/`, `findings/`, `archive/`

**`--tools <tool>`:** Additionally installs MLSpec skills/commands for the specified tool.

**`--no-tools`:** Workspace-only setup, no tool integrations.

**Non-interactive mode:** If `--tools` is provided, runs without prompts. If not provided and non-interactive, behaves like `--no-tools`.

**Rationale:** Matches user expectation that `mlspec init` is "MLSpec setup" not "OpenSpec MLSpec setup." The workspace creation is always included (creating evaluation.md and AGENTS.md is part of MLSpec setup).

### 4. MLSpec skills installation path

**Decision:** MLSpec skills install to each tool's standard skills directory:
```
.opencode/skills/mlspec-*/SKILL.md
.opencode/commands/mlspec-*.md
```

**Decision:** MLSpec init installs ONLY the 6 MLSpec workflows, not OpenSpec SWE workflows.

**Rationale:**
- `.opencode/` is the OpenCode tool's directory for skills and commands. MLSpec skills live alongside OpenSpec skills in the same directory, just different subdirectories.
- MLSpec skills in `.opencode/skills/mlspec-explore/` are clearly distinguished from OpenSpec skills in `.opencode/skills/openspec-propose/`.
- The tool owns the directory; MLSpec is a "guest" workflow that happens to use the same tool.

**Alternatives considered:**
- Separate `.mlspec/skills/` directory: Would require tool adapters to know about MLSpec-specific paths, adding complexity
- Installing MLSpec skills outside tool directories: MLSpec skills wouldn't be discovered by the AI tool

### 5. Reuse of existing utilities

**Decision:** MLSpec init/update reuse existing skill-generation utilities with MLSpec workflow filtering.

The existing utilities in `src/core/shared/skill-generation.ts` already support MLSpec workflows:
- `getSkillTemplates(['mlspec-explore', 'mlspec-propose-experiment', ...])` returns only MLSpec skill templates
- `getCommandContents(['mlspec-explore', ...])` returns only MLSpec command templates
- `generateSkillContent()` with `generatedBy` version field

**Decision:** MLSpec-specific command classes (`MlspecInitCommand`, `MlspecUpdateCommand`) call these utilities with MLSpec workflow IDs.

**Rationale:** No duplication of skill-generation logic. The MLSpec CLI just passes different workflow filters to the same utilities.

### 6. MLSpec update behavior

**Decision:** `mlspec update` refreshes MLSpec skills/commands and MLSpec protocol files.

**Behavior:**
- Checks for `mlspec/` workspace existence; fails if missing
- Reads `mlspec/.workspace.yaml` to detect workspace version
- Checks version of installed MLSpec skills (via `generatedBy` field)
- Regenerates MLSpec skills/commands for configured tools
- Updates MLSpec protocol files (AGENTS.md, evaluation.md) if needed

**`--tools <tool>`:** Refreshes only the specified tool's MLSpec integrations.

**No `--tools`:** Refreshes all tools that have MLSpec skills installed.

**Rationale:** Consistent with `openspec update` pattern, but MLSpec-specific. If no `mlspec/` workspace exists, it's a clear error (not just "nothing to update").

### 7. Compatibility: openspec ml remains

**Decision:** `openspec ml ...` continues to work as a compatibility alias.

**Behavior:**
- `openspec ml init`: Creates `mlspec/` workspace (existing behavior, unchanged)
- `openspec ml status`: Shows MLSpec status (existing behavior, unchanged)
- Other `openspec ml` commands: Unchanged

**Decision:** `openspec init` behavior is NOT changed. It remains OpenSpec/SWE setup only.

**Rationale:** Users who have automation scripts using `openspec ml` continue to work. The standalone `mlspec` binary is the new recommended way; `openspec ml` is the compatibility path.

## Risks / Trade-offs

### Risk: Two places to update MLSpec skills
**Risk:** Users might update via `openspec update` (which could refresh MLSpec skills if they were installed via `openspec init` with custom profile) or via `mlspec update`. These could conflict or overwrite each other.

**Mitigation:** `openspec update` uses the profile's workflow list (CORE_WORKFLOWS by default, which does NOT include MLSpec workflows). MLSpec skills are only installed via `mlspec init --tools ...` and refreshed via `mlspec update`. These are separate code paths.

### Risk: Dual skill installation confusion
**Risk:** A user could run both `openspec init --tools opencode` (getting OpenSpec SWE skills) and `mlspec init --tools opencode` (getting MLSpec skills) in the same project. They might not understand which skills do what.

**Mitigation:** Clear messaging during `mlspec init --tools` showing what was installed. Skill directory names are clear: `openspec-propose/` vs `mlspec-explore/`. Help text and documentation explain the distinction.

### Risk: Version tracking complexity
**Risk:** MLSpec skills have their own `generatedBy` version tracking. If OpenSpec version and MLSpec version diverge, version comparison logic might be confusing.

**Mitigation:** Each skill file has its own `generatedBy` field. The update logic compares skill file's `generatedBy` against the current MLSpec CLI version (which mirrors OpenSpec version for simplicity).

### Trade-off: Code duplication vs. clean separation
**Trade-off:** Creating separate `MlspecInitCommand` and `MlspecUpdateCommand` classes means some code duplication with `InitCommand` and `UpdateCommand`. However, the skill-generation utilities are shared; only the orchestration logic differs.

**Mitigation:** Extract shared helper methods where practical (e.g., tool detection, skill generation calls), but keep MLSpec-specific logic isolated for clarity.

## Migration Plan

### Phase 1: Standalone CLI scaffold
1. Add `src/mlspec/cli/` directory with `index.ts` entry point
2. Register `mlspec` binary in `package.json`
3. Create `MlspecInitCommand` class (stub initially)
4. Wire up basic command registration

### Phase 2: MLSpec init implementation
1. Implement `mlspec init` workspace creation (evaluation.md, AGENTS.md, subdirs)
2. Implement `--tools` option for tool integration
3. Implement `--no-tools` option for workspace-only
4. Add MLSpec-specific welcome messaging

### Phase 3: MLSpec update implementation
1. Implement `MlspecUpdateCommand` class
2. Implement `mlspec update` workflow
3. Add `mlspec/` workspace existence check

### Phase 4: Testing and compatibility
1. Add tests for all new commands
2. Verify `openspec ml ...` compatibility still works
3. Verify `openspec init` behavior unchanged

### Rollback
- Remove `mlspec` binary from `package.json`
- Remove `src/mlspec/cli/` directory
- User must re-run `openspec init` if they want OpenSpec skills

## Open Questions

None. All decisions have been made by the user and documented above.
