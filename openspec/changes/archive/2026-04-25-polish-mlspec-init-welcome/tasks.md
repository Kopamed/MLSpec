## 1. Create MLSpec welcome banner module

- [x] 1.1 Create `src/mlspec/ui/welcome-banner.ts` with MLSpec welcome banner function
- [x] 1.2 Implement `showMlspecWelcome()` function with ASCII art (diamond pattern with "ML" center)
- [x] 1.3 Implement text content showing configuration items and quick start commands
- [x] 1.4 Add TTY detection for animation vs fallback mode
- [x] 1.5 Add "Press Enter to select tools..." prompt support

## 2. Update MLSpec init to use welcome banner

- [x] 2.1 Import welcome-banner module in `src/mlspec/cli/mlspec-init.ts`
- [x] 2.2 Replace existing `showWelcome()` call with new `showMlspecWelcome()` function
- [x] 2.3 Ensure non-interactive mode skips welcome banner

## 3. Add tests for MLSpec welcome banner

- [x] 3.1 Add test: `mlspec init` in interactive mode shows MLSpec welcome banner
- [x] 3.2 Add test: `mlspec init --tools opencode` skips welcome banner
- [x] 3.3 Add test: Welcome banner contains "Welcome to MLSpec" text
- [x] 3.4 Add test: Welcome banner shows MLSpec quick start commands

## 4. Validate

- [x] 4.1 Run `npm run build` and verify no errors
- [x] 4.2 Run `npm run lint` and verify no errors
- [x] 4.3 Run `npm test` and verify all tests pass
