## 1. Create MLSpec Template Modules

- [x] 1.1 Create `src/core/templates/workflows/mlspec-explore.ts`
- [x] 1.2 Create `src/core/templates/workflows/mlspec-propose-experiment.ts`
- [x] 1.3 Create `src/core/templates/workflows/mlspec-run-evidence.ts`
- [x] 1.4 Create `src/core/templates/workflows/mlspec-decide.ts`
- [x] 1.5 Create `src/core/templates/workflows/mlspec-promote.ts`
- [x] 1.6 Create `src/core/templates/workflows/mlspec-archive.ts`

## 2. Update Template Exports

- [x] 2.1 Export MLSpec templates from `src/core/templates/skill-templates.ts`

## 3. Update Profile System

- [x] 3.1 Add MLSpec workflows to `ALL_WORKFLOWS` in `src/core/profiles.ts`
- [x] 3.2 Add MLSpec entries to `WORKFLOW_TO_SKILL_DIR` in `src/core/profile-sync-drift.ts`

## 4. Update Tool Detection

- [x] 4.1 Add MLSpec skill names to `SKILL_NAMES` in `src/core/shared/tool-detection.ts`

## 5. Update OpenCode Adapter

- [x] 5.1 Modify `getFilePath()` in `src/core/command-generation/adapters/opencode.ts` to emit `mlspec-*.md` for MLSpec command IDs

## 6. Root `.opencode` Files (Kept as Installed Output)

The root `.opencode/skills/mlspec-*/` and `.opencode/commands/mlspec-*.md` files are **installed/example output**, not canonical source. Canonical source is now `src/core/templates/workflows/mlspec-*.ts`.

These files are kept for self-use/testing but may diverge from templates over time.

## 7. Add Tests

- [x] 7.1 Add test: OpenCode init generates all six MLSpec skill files (added in skill-generation.test.ts)
- [x] 7.2 Add test: OpenCode init generates all six MLSpec command files with `mlspec-*.md` names (added in adapters.test.ts)
- [x] 7.3 Add end-to-end test: OpenCode init with custom profile generates MLSpec skills and commands (added in init.test.ts: "should generate MLSpec skills and commands for OpenCode with custom profile")
- [x] 7.4 Add test: Existing OpenSpec SWE workflows still generate correctly (verified via existing tests)
- [x] 7.5 Add test: Template and command content stay in sync (same source) (verified via getCommandTemplates/getSkillTemplates)

## 8. Validate

- [x] 8.1 Run `npm run build` and verify no errors
- [x] 8.2 Run `npm run lint` and verify no errors
- [x] 8.3 Run `npm test` and verify all tests pass
- [x] 8.4 Run `openspec validate add-mlspec-workflow-skills --strict`

## 9. Archive

- [ ] 9.1 Archive the change
