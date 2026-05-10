# fixture-test-harness Specification

## Purpose
TBD - created by archiving change fixture-test-harness. Update Purpose after archive.
## Requirements
### Requirement: Test harness location
The test harness SHALL be located at `test/harness.ts`.

#### Scenario: Harness lives at correct path
- **WHEN** test runner imports harness
- **THEN** harness is at test/harness.ts

### Requirement: Build MLSpec before testing
The harness SHALL build MLSpec using `bun build.ts` before running tests to ensure latest code is used.

#### Scenario: MLSpec is built before tests run
- **WHEN** harness starts
- **THEN** bun build.ts is executed first

### Requirement: Temp workspace creation
For each fixture test, the harness SHALL create a temporary workspace at `/tmp/mlspec-test-$UUID/`.

#### Scenario: Workspace created with unique ID
- **WHEN** harness prepares to test a fixture
- **THEN** a temp directory at /tmp/mlspec-test-<UUID>/ is created

### Requirement: Environment copying
The harness SHALL copy `fixtures/<id>/environment/*` to the temp workspace root.

#### Scenario: Environment files copied to workspace
- **WHEN** workspace is prepared
- **THEN** fixtures/<id>/environment/* exists in workspace root

### Requirement: MLSpec CLI distribution
The harness SHALL copy `dist/index.js` to the temp workspace root.

#### Scenario: MLSpec CLI available in workspace
- **WHEN** workspace is prepared
- **THEN** dist/index.js exists in workspace root

### Requirement: Prompt injection
The harness SHALL read the `prompt` field from `fixtures/<id>/fixture.yaml` and pass it to Claude Code.

#### Scenario: Prompt loaded from fixture.yaml
- **WHEN** harness reads fixture configuration
- **THEN** prompt field is extracted from fixture.yaml

### Requirement: Structured output requirement
The harness SHALL launch Claude Code with `--output-format json` and `--json-schema` pointing to the `output_schema` from `fixture.yaml`.

#### Scenario: Claude Code launched with structured output
- **WHEN** agent is launched
- **THEN** --output-format json and --json-schema flags are passed

### Requirement: Workspace cleanup
The harness SHALL remove the temp workspace after test completion (success or failure).

#### Scenario: Workspace cleaned up after test
- **WHEN** test completes (pass or fail)
- **THEN** /tmp/mlspec-test-<UUID>/ is removed

### Requirement: Result comparison
The harness SHALL compare agent output against `expected` from `fixture.yaml`:
- `verdict`: MUST match exactly
- `failed_checks`: expected items MUST be present (order无关)

#### Scenario: Verdict exact match
- **WHEN** agent returns verdict
- **THEN** it must exactly match expected.verdict

#### Scenario: Failed checks subset match
- **WHEN** agent returns failed_checks
- **THEN** all expected.failed_checks must be present

### Requirement: Free text not compared
The `reasoning` field from agent output SHALL NOT be compared against expected values.

#### Scenario: Reasoning is not compared
- **WHEN** agent returns reasoning
- **THEN** no assertion is made on its content

### Requirement: Fixture configuration format
Each fixture SHALL have a `fixture.yaml` at the fixture root (NOT inside environment/) with:
```yaml
prompt: <text>
output_schema: <JSON schema>
expected:
  verdict: <string>
  failed_checks: [<strings>]
```

#### Scenario: Valid fixture.yaml structure
- **WHEN** fixture.yaml is parsed
- **THEN** it contains prompt, output_schema, and expected fields

### Requirement: Environment isolation
The `environment/` folder SHALL contain only experiment data. No `expected.txt`, `prompt.md`, or other validation artifacts SHALL be present inside environment/.

#### Scenario: Environment has no validation artifacts
- **WHEN** environment/ is inspected
- **THEN** no expected.txt or prompt.md exists there

