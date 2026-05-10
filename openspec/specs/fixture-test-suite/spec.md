# fixture-test-suite Specification

## Purpose
TBD - created by archiving change mlspec-structured-output. Update Purpose after archive.
## Requirements
### Requirement: Test suite location
The fixture test suite SHALL be located at `test/fixtures.test.ts`.

**Previously:** Test suite at `test/fixtures.test.ts` using vitest with expected.txt substring matching.

#### Scenario: Test suite at correct path
- **WHEN** vitest runs
- **THEN** it finds tests at test/fixtures.test.ts

### Requirement: Uses vitest
The test suite SHALL use vitest for running tests, with fixture-test-harness for agent-based fixtures.

**Previously:** Uses vitest with subprocess execution and substring matching.

#### Scenario: Harness is available for agent tests
- **WHEN** test suite executes
- **THEN** fixture-test-harness is available for agent-based fixtures

### Requirement: One test per fixture
For static tests, for each fixture, there SHALL be one test that:
1. Runs `node dist/index.js check eos-test --root fixtures/<fixture-id>/environment`
2. Captures stdout
3. Asserts expected substrings in output

**Previously:** Runs `node dist/index.js check eos-test --root fixtures/<fixture-id>`, captures stdout, asserts substring match.

#### Scenario: One test per fixture for static tests
- **WHEN** fixtures are discovered
- **THEN** each fixture has exactly one corresponding static test

### Requirement: Substring matching
Static tests SHALL use substring matching for verifying MLSpec output.

**Previously:** Uses substring matching against expected.txt.

#### Scenario: Substring matching for static tests
- **WHEN** static test runs
- **THEN** it uses substring matching on MLSpec output

### Requirement: Expected file format
Static tests SHALL use `fixture.yaml` for expected values, not `expected.txt`.

**Previously:** Each fixture's `expected.txt` contains text substrings.

#### Scenario: fixture.yaml used for expected values
- **WHEN** static test runs
- **THEN** it reads expected values from fixture.yaml

### Requirement: Agent fixtures in separate file
Agent-based fixture tests SHALL be in `test/fixtures.agent.test.ts`.

#### Scenario: Agent tests in separate file
- **WHEN** agent tests are needed
- **THEN** they are in test/fixtures.agent.test.ts

### Requirement: Agent test harness
The `test/harness.ts` module SHALL provide `runFixtureTest()` for launching agent-based tests.

#### Scenario: Harness provides runFixtureTest
- **WHEN** agent test needs to run
- **THEN** it uses runFixtureTest() from harness

### Requirement: No expected.txt usage
Tests SHALL NOT read `expected.txt` files. All validation uses `fixture.yaml` structured configuration.

#### Scenario: No expected.txt files are read
- **WHEN** tests run
- **THEN** no test reads expected.txt

### Requirement: Structured output validation for agents
Agent tests SHALL use schema validation against `output_schema` from `fixture.yaml`.

#### Scenario: Structured output validated for agents
- **WHEN** agent returns JSON output
- **THEN** it is validated against output_schema

