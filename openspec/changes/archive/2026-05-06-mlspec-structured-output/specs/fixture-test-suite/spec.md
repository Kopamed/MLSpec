# Fixture Test Suite

## ADDED Requirements

### Requirement: Test suite location
The fixture test suite SHALL be located at `test/fixtures.test.ts`.

### Requirement: Uses vitest
The test suite SHALL use vitest (already a project dependency).

### Requirement: One test per fixture
For each fixture, there SHALL be one test that:
1. Runs `node dist/index.js check eos-test --root fixtures/<fixture-id>`
2. Captures stdout
3. Reads `fixtures/<fixture-id>/expected.txt`
4. Asserts that stdout contains the expected text

### Requirement: Substring matching
Tests SHALL use substring matching (not exact match) to allow flexibility in output formatting.

### Requirement: Expected file format
Each fixture's `expected.txt` SHALL contain one or more text substrings that MUST appear in the output.

#### Scenario: Valid fixture test
- **WHEN** test runs against fixture with valid expected.txt
- **THEN** test passes if output contains expected substring

#### Scenario: Invalid fixture test
- **WHEN** test runs against fixture but output does not contain expected substring
- **THEN** test fails with diff showing missing text
