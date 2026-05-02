## Why

MLSpec workflows (experiment management for ML) are currently accessible only through `openspec ml ...`, which bundles them with OpenSpec/SWE setup. Users need a dedicated `mlspec` CLI that provides a focused MLSpec setup experience—creating workspaces, installing MLSpec skills, and managing experiments—without requiring OpenSpec/SWE setup. This separation clarifies the distinction between OpenSpec (spec-driven SWE changes) and MLSpec (ML experimentation).

## What Changes

- **New `mlspec` binary**: Standalone CLI entry point with MLSpec-specific commands
- **`mlspec init`**: MLSpec workspace setup with welcome messaging, creates `mlspec/` directory with evaluation.md, AGENTS.md, and required subdirectories
- **`mlspec init --tools <tool>`**: Non-interactive setup that also installs MLSpec skills/commands for specified AI tools
- **`mlspec init --no-tools`**: Workspace-only setup without tool integrations
- **`mlspec update`**: Refresh MLSpec skills/commands and protocol files for existing project
- **`mlspec update --tools <tool>`**: Refresh for specific tool only
- **Tool integration**: MLSpec skills install into each tool's normal skills directory (e.g., `.opencode/skills/mlspec-*/`)
- **Workflow separation**: `mlspec init --tools opencode` installs ONLY MLSpec workflows, not OpenSpec SWE workflows
- **Compatibility**: `openspec ml ...` remains as a compatibility alias

## Capabilities

### New Capabilities
- `standalone-mlspec-cli`: Standalone MLSpec CLI providing `mlspec init`, `mlspec update`, `mlspec status`, `mlspec validate`, and experiment management commands (`mlspec new`, `mlspec add-evidence`, `mlspec decide`, `mlspec promote`, `mlspec archive`)

### Modified Capabilities
- (none)

## Impact

- New `src/mlspec/cli/` directory with entry point and MLSpec-specific init/update commands
- Reuses existing `src/core/shared/skill-generation.ts` utilities for skill/command generation (MLSspec workflows filtered via workflow ID)
- Reuses existing `src/core/command-generation/adapters/` for tool-specific command file generation
- MLSpec skills install to `.opencode/skills/mlspec-*/` (same location as OpenSpec skills, different subdirs)
- `openspec ml ...` remains functional as compatibility alias
- `openspec init` behavior unchanged (OpenSpec/SWE setup)
- No changes to OpenSpec SWE workflow templates or skill generation
