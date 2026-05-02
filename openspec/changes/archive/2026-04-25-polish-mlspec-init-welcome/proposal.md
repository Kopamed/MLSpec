## Why

MLSpec init currently lacks the welcoming banner that OpenSpec init has. While functionally complete, adding a proper welcome screen improves user experience by setting context, explaining what's being configured, and providing quick reference for MLSpec commands.

## What Changes

- Add ASCII art welcome banner to `mlspec init` showing "Welcome to MLSpec" and "An evidence-driven ML experimentation framework"
- Display what will be configured: workspace, agent skills, slash commands
- Show quick start commands after setup with brief descriptions
- Support interactive mode with "Press Enter to select tools..." prompt

## Capabilities

### New Capabilities

- `mlspec-init-welcome`: Defines the welcome banner content, formatting, and display behavior for `mlspec init` command

## Impact

- Modified: `src/mlspec/cli/mlspec-init.ts` (MlspecInitCommand class)
- No changes to workspace structure or skill installation logic
- No breaking changes to existing behavior