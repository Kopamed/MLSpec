## Why

MLSpec needs better output formatting and testing infrastructure. Currently the tool outputs unstructured text that doesn't support machine parsing or alternative renderers. We also need to add test coverage for fixtures and implement the `init` command.

## What Changes

- Change experiment data directory from `.mlspec/` to `mlspec/` (visible, committed scientific record)
- Add `--json` flag for structured JSON output
- Add `--xml` flag for structured XML output
- Improve human-readable renderer with minimal design (left-aligned, uppercase verdicts, simple symbols)
- Implement `mlspec init` command to create empty `mlspec/` directory
- Add two adversarial fixtures: metric-script-mismatch and smoke-promoted-as-validation
- Add automated test suite that runs MLSpec against fixtures and verifies expected output

## Capabilities

### New Capabilities

- `structured-output`: Commands produce structured data internally, then render via pluggable renderers (human, JSON, XML). Default is human.

- `human-renderer`: Terminal output uses minimal design: left-aligned, uppercase verdicts, simple ASCII symbols (✓ ✗ ⚠), color only for verdict symbol.

- `json-renderer`: `--json` flag outputs machine-parseable JSON with full result data.

- `xml-renderer`: `--xml` flag outputs XML format with full result data.

- `mlspec-init`: Creates `mlspec/` directory skeleton if it doesn't exist. Does NOT create AGENTS.md.

- `fixture-test-suite`: Automated tests that run `mlspec check` against each fixture and verify output matches `expected.txt`.

- `fixture-002-metric-script-mismatch`: Adversarial fixture where candidate and baseline use different metric scripts (eval-v1 vs eval-v2).

- `fixture-003-smoke-promoted-as-validation`: Adversarial fixture where candidate is smoke stage but experiment requires validation.

### Modified Capabilities

- `mlspec-check`: **BREAKING** - Directory changed from `.mlspec/` to `mlspec/`. Renderer interface refactored to support multiple output formats.

## Impact

- `src/check.ts`: Refactored to return structured Result type, renderer abstracted
- `src/index.ts`: Added `--json` and `--xml` flags
- `src/renderers/` directory: human.ts, json.ts, xml.ts
- `fixtures/`: Two new fixtures added
- `test/fixtures.test.ts`: New test suite added
- `package.json`: No new dependencies (using existing picocolors)
