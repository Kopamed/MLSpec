## 1. Dependency Change

- [x] 1.1 Remove picocolors from package.json dependencies
- [x] 1.2 Add chalk to package.json dependencies
- [x] 1.3 Run bun install to update node_modules

## 2. Update io.ts

- [x] 2.1 Remove picocolors import from io.ts
- [x] 2.2 Add chalk import
- [x] 2.3 Update die() to use chalk.red('ERROR: ${message}')

## 3. Update Human Renderer

- [x] 3.1 Remove picocolors import from human.ts
- [x] 3.2 Add chalk import
- [x] 3.3 Style header with chalk.white.bold()
- [x] 3.4 Style labels (Objective, Claim, Why, etc.) with chalk.dim()
- [x] 3.5 Keep verdict symbols colored (green/red/yellow)
- [x] 3.6 Style explanatory text with chalk.dim()

## 4. Update JSON/XML Renderers

- [x] 4.1 Remove picocolors imports if present
- [x] 4.2 Verify JSON/XML output unaffected (they don't use colors)

## 5. Test and Verify

- [x] 5.1 Build with bun build.ts
- [x] 5.2 Test mlspec check against fixture 001
- [x] 5.3 Verify chalk styling applied correctly
- [x] 5.4 Run bun test to verify all tests pass

## 6. Update AGENTS.md

- [x] 6.1 Update Human Design Language section to reflect new chalk aesthetics
