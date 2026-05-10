## 1. Restructure Existing Fixtures

- [x] 1.1 Restructure 001-eval-split-mismatch: create environment/, move experiment data, create fixture.yaml
- [x] 1.2 Restructure 002-metric-script-mismatch: create environment/, move experiment data, create fixture.yaml
- [x] 1.3 Restructure 003-smoke-promoted-as-validation: create environment/, move experiment data, create fixture.yaml
- [x] 1.4 Delete expected.txt and prompt.md from all fixtures

## 2. Build Test Harness

- [x] 2.1 Create test/harness.ts with workspace management (create, cleanup)
- [x] 2.2 Add MLSpec build step before tests
- [x] 2.3 Implement environment copying (environment/* to workspace)
- [x] 2.4 Implement dist/index.js copying to workspace
- [x] 2.5 Add Claude Code launch with --output-format json --json-schema
- [x] 2.6 Implement result comparison (verdict exact match, failed_checks subset match)
- [x] 2.7 Add proper cleanup (try/finally or process cleanup)

## 3. Update Test Suite

- [x] 3.1 Rewrite test/fixtures.test.ts to use new harness (static tests default)
- [x] 3.2 Create test/fixtures.agent.test.ts for dynamic agent tests (explicit only)
- [x] 3.3 Verify static tests pass for all three fixtures

## Test Commands

```bash
# Static tests (default - run MLSpec directly)
bun test test/fixtures.test.ts

# Agent tests (explicit - launch Claude Code against fixtures)
bun test test/fixtures.agent.test.ts
```
