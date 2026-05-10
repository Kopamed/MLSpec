## Why

The current fixture testing approach is manual and text-based. MLSpec's `expected.txt` uses substring matching which is fragile and doesn't support programmatic verification. We need to test MLSpec by launching Claude Code agents against fixtures with structured output validation, ensuring agents actually use MLSpec correctly rather than just pattern-matching responses.

## What Changes

- Restructure fixtures to use `environment/` folder (clean, no validation artifacts) + `fixture.yaml` (structured config)
- Build a test harness that copies environment to temp workspace, launches Claude Code with structured output schema, and compares results
- Remove `expected.txt` and `prompt.md` from fixtures
- Use Claude Code's `--output-format json` with `--json-schema` for deterministic validation
- Support both static tests (mlspec detects problem) and dynamic tests (agent uses mlspec correctly)

## Capabilities

### New Capabilities

- `fixture-test-harness`: Programmatic test harness that runs Claude Code against fixtures with structured output. Creates temp workspace, copies MLSpec dist, launches agent with prompt from fixture.yaml, validates output against expected schema.

### Modified Capabilities

- `fixture-test-suite`: Change from vitest-based substring matching to Claude Code programmatic testing with structured output validation. Update requirements to reflect new structure.

## Impact

- `fixtures/` - Restructure existing fixtures (001-eval-split-mismatch, 002-metric-script-mismatch, 003-smoke-promoted-as-validation)
- `test/fixtures.test.ts` - Rewrite to use test harness
- New `test/harness.ts` - Test orchestration (copy, launch, compare, cleanup)
