## 1. Package.json binary registration

- [x] 1.1 Add `mlspec` binary entry point to `package.json` pointing to `dist/mlspec/index.js`

## 2. Create MLSpec CLI directory structure

- [x] 2.1 Create `src/mlspec/cli/` directory
- [x] 2.2 Create `src/mlspec/cli/index.ts` as MLSpec CLI entry point (exports registerMlspecCommands function)
- [x] 2.3 Create `src/mlspec/cli/mlspec-init.ts` for MlspecInitCommand
- [x] 2.4 Create `src/mlspec/cli/mlspec-update.ts` for MlspecUpdateCommand
- [x] 2.5 Create `src/mlspec/index.ts` as the binary entry point (imports and calls registerMlspecCommands)

## 3. Implement MlspecInitCommand

- [x] 3.1 Create MLSpecInitCommand class with constructor accepting `{ tools?: string, interactive?: boolean, force?: boolean }`
- [x] 3.2 Implement `execute(projectPath)` method that:
  - Creates or refreshes `mlspec/` workspace
  - Creates `mlspec/evaluation.md` and `mlspec/AGENTS.md`
  - Creates `mlspec/.workspace.yaml`
  - Creates required subdirectories: baselines/, experiments/, candidates/, findings/, archive/
- [x] 3.3 Implement `--tools` option to install MLSpec skills/commands for specified tool
- [x] 3.4 Implement `--no-tools` option for workspace-only setup
- [x] 3.5 Add MLSpec-specific welcome messaging (not OpenSpec messaging)
- [x] 3.6 MLSpec init installs ONLY MLSpec workflows (mlspec-explore, mlspec-propose-experiment, mlspec-run-evidence, mlspec-decide, mlspec-promote, mlspec-archive), not OpenSpec SWE workflows

## 4. Implement MlspecUpdateCommand

- [x] 4.1 Create MlspecUpdateCommand class with constructor accepting `{ tools?: string, force?: boolean }`
- [x] 4.2 Implement `execute(projectPath)` method that:
  - Checks for `mlspec/` workspace existence (fails with clear error if missing)
  - Refreshes MLSpec skills and commands for configured or specified tools
- [x] 4.3 Implement `--tools` option to update specific tool only
- [x] 4.4 No `--tools` flag: updates all tools with MLSpec skills installed

## 5. MLSpec workflow filtering for skill generation

- [x] 5.1 Create `src/mlspec/cli/mlspec-workflows.ts` exporting MLSpec-specific workflow ID list: `['mlspec-explore', 'mlspec-propose-experiment', 'mlspec-run-evidence', 'mlspec-decide', 'mlspec-promote', 'mlspec-archive']`
- [x] 5.2 MlspecInitCommand and MlspecUpdateCommand use this constant when calling `getSkillTemplates()` and `getCommandContents()`

## 6. Tool detection for MLSpec CLI

- [x] 6.1 Reuse `getAvailableTools()` from `src/core/available-tools.ts` for tool detection
- [x] 6.2 Reuse `AI_TOOLS` from `src/core/config.ts` for tool validation
- [x] 6.3 MLSpec init shows interactive tool selection similarly to openspec init (if interactive mode)

## 7. Wire up MLSpec CLI in package.json and build

- [x] 7.1 Ensure `openspec build` compiles `src/mlspec/` TypeScript files to `dist/mlspec/`
- [x] 7.2 Verify `mlspec --help` works via `node dist/mlspec/index.js --help`

## 8. Add tests for MLSpec CLI

- [x] 8.1 Add test: `mlspec --help` shows MLSpec commands (not OpenSpec commands)
- [x] 8.2 Add test: `mlspec init --no-tools` creates `mlspec/` workspace with evaluation.md, AGENTS.md, .workspace.yaml, and subdirectories
- [x] 8.3 Add test: `mlspec init --tools opencode` creates `mlspec/` workspace AND `.opencode/skills/mlspec-*/` skill files AND `.opencode/commands/mlspec-*.md` command files
- [x] 8.4 Add test: MLSpec init installs ONLY MLSpec workflows (verifies openspec-* files are NOT created)
- [x] 8.5 Add test: `mlspec init` in interactive mode shows MLSpec welcome messaging
- [x] 8.6 Add test: `mlspec update` fails with clear error when `mlspec/` workspace does not exist
- [x] 8.7 Add test: `mlspec update --tools opencode` refreshes only OpenCode MLSpec skills
- [x] 8.8 Add test: `openspec ml status` still works (compatibility)
- [x] 8.9 Add test: `openspec init --tools opencode` still installs only OpenSpec SWE workflows (not MLSpec)

## 9. Validate

- [x] 9.1 Run `npm run build` and verify no errors
- [x] 9.2 Run `npm run lint` and verify no errors
- [x] 9.3 Run `npm test` and verify all tests pass
- [x] 9.4 Run `openspec validate add-standalone-mlspec-cli --strict`
