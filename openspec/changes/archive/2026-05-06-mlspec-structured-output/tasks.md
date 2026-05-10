## 1. Directory Change

- [x] 1.1 Update check.ts to read from `mlspec/experiments/` instead of `.mlspec/experiments/`
- [x] 1.2 Update index.ts --root flag to point to `mlspec/` within root
- [x] 1.3 Move existing fixture data from `.mlspec/` to `mlspec/`

## 2. Structured Result Type

- [x] 2.1 Create `src/types.ts` with `CheckResult` interface
- [x] 2.2 Update `src/check.ts` to return `CheckResult` instead of using printVerdict

## 3. Renderer Interface

- [x] 3.1 Create `src/renderers.ts` with `Renderer` interface
- [x] 3.2 Create `src/renderers/human.ts` with HumanRenderer class
- [x] 3.3 Create `src/renderers/json.ts` with JsonRenderer class
- [x] 3.4 Create `src/renderers/xml.ts` with XmlRenderer class

## 4. Update CLI Entry

- [x] 4.1 Add `--json` flag to CLI
- [x] 4.2 Add `--xml` flag to CLI
- [x] 4.3 Select renderer based on flag
- [x] 4.4 Update help text to show new flags

## 5. Implement mlspec init

- [x] 5.1 Add init command handler in index.ts
- [x] 5.2 Create mlspec/ directory if it doesn't exist
- [x] 5.3 Handle error if file named mlspec exists
- [x] 5.4 Update help text

## 6. Human Renderer Implementation

- [x] 6.1 Implement left-aligned output without borders
- [x] 6.2 Use uppercase verdicts
- [x] 6.3 Use ✓ ✗ ⚠ symbols with appropriate color
- [x] 6.4 Add blank line separation

## 7. JSON Renderer Implementation

- [x] 7.1 Implement render method returning JSON string
- [x] 7.2 Include all result fields
- [x] 7.3 Pretty-print with 2-space indent

## 8. XML Renderer Implementation

- [x] 8.1 Implement render method returning XML string
- [x] 8.2 Use appropriate XML element structure
- [x] 8.3 Handle nested metrics as attributes

## 9. Update Existing Fixture

- [x] 9.1 Move fixtures/001-eval-split-mismatch/.mlspec/ to fixtures/001-eval-split-mismatch/mlspec/

## 10. Add Fixture 002

- [x] 10.1 Create fixtures/002-metric-script-mismatch/ directory structure
- [x] 10.2 Create mlspec/experiments/eos-test/experiment.yaml
- [x] 10.3 Create baseline run with metric_script: eval-v1
- [x] 10.4 Create candidate run with metric_script: eval-v2
- [x] 10.5 Create prompt.md and expected.txt

## 11. Add Fixture 003

- [x] 11.1 Create fixtures/003-smoke-promoted-as-validation/ directory structure
- [x] 11.2 Create mlspec/experiments/eos-test/experiment.yaml
- [x] 11.3 Create baseline run with stage: validation
- [x] 11.4 Create candidate run with stage: smoke
- [x] 11.5 Create prompt.md and expected.txt

## 12. Test Suite

- [x] 12.1 Create test/fixtures.test.ts
- [x] 12.2 Add vitest test for fixture 001
- [x] 12.3 Add vitest test for fixture 002
- [x] 12.4 Add vitest test for fixture 003
- [x] 12.5 Run tests and verify all pass
