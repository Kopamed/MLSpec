# human-renderer Specification

## Purpose
TBD - created by archiving change mlspec-structured-output. Update Purpose after archive.
## Requirements
### Requirement: Left-aligned output
The human renderer SHALL output left-aligned text without borders or box-drawing characters.

#### Scenario: Output is left-aligned
- **WHEN** output is rendered
- **THEN** it contains no borders or box-drawing characters

### Requirement: Uppercase verdicts
Verdicts SHALL be displayed in uppercase:
- "VALID COMPARISON"
- "INVALID COMPARISON"
- "CLAIM NOT SUPPORTED"

#### Scenario: Verdicts are uppercase
- **WHEN** verdict is displayed
- **THEN** it uses uppercase text

### Requirement: Simple verdict symbols
The human renderer SHALL use simple ASCII symbols with chalk coloring:
- `chalk.green('✓ VALID COMPARISON')`
- `chalk.red('✗ INVALID COMPARISON')`
- `chalk.yellow('⚠ CLAIM NOT SUPPORTED')`

#### Scenario: Verdicts use chalk colors
- **WHEN** verdict is rendered
- **THEN** it uses chalk for coloring

### Requirement: Color only on verdict
The human renderer SHALL use chalk for terminal styling with OpenSpec's aesthetic hierarchy. Color is applied to headers, labels, and explanatory text in addition to verdict symbols.

#### Scenario: Chalk styling applied to all output
- **WHEN** output is rendered
- **THEN** chalk is used for all styling including header, labels, and explanatory text

### Requirement: Blank line separation
Sections SHALL be separated by blank lines for readability.

#### Scenario: Blank lines separate sections
- **WHEN** output contains multiple sections
- **THEN** blank lines separate them

### Requirement: Valid comparison output format
The human renderer SHALL output valid comparison results using chalk styling. For VALID verdict:

```
MLSpec check: <experiment-id>

Objective: <objective>
Claim: <claim.text>

✓ VALID COMPARISON

  <metric-name>
  baseline:  <value>
  candidate: <value>

  The required controls match and the target metric improved.
```

#### Scenario: Valid comparison output format
- **WHEN** verdict is VALID
- **THEN** output follows the valid comparison format

### Requirement: Invalid comparison output format
The human renderer SHALL output invalid comparison results with failure explanations. For INVALID verdict:

```
MLSpec check: <experiment-id>

Objective: <objective>
Claim: <claim.text>

✗ INVALID COMPARISON

  <metric-name>
  baseline:  <value>
  candidate: <value>

  Why:
  • <failure-1-message>
    baseline:  <failure-1.baseline>
    candidate: <failure-1.candidate>
  • <failure-2-message>
  ...

  Allowed:
  • Candidate produced higher metric in its run

  Disallowed:
  • Candidate is better than baseline
  • Intervention caused the improvement
  • Candidate recipe should be promoted
```

#### Scenario: Invalid comparison output format
- **WHEN** verdict is INVALID
- **THEN** output follows the invalid comparison format

### Requirement: Claim not supported output format
The human renderer SHALL output claim not supported results. For NOT_SUPPORTED verdict:

```
MLSpec check: <experiment-id>

Objective: <objective>
Claim: <claim.text>

⚠ CLAIM NOT SUPPORTED

  <metric-name>
  baseline:  <value>
  candidate: <value>

  The comparison controls passed, but the target metric did not improve.
```

#### Scenario: Claim not supported output format
- **WHEN** verdict is NOT_SUPPORTED
- **THEN** output follows the claim not supported format

### Requirement: Header styling
The experiment header line SHALL use `chalk.white.bold()`.

#### Scenario: Header is bold white
- **WHEN** output contains "MLSpec check: eos-test"
- **THEN** it is styled with chalk.white.bold()

### Requirement: Label styling
Labels such as "Objective:", "Claim:", "Why:", "Allowed:", "Disallowed:" SHALL use `chalk.dim()`.

#### Scenario: Labels are dimmed
- **WHEN** output contains labels
- **THEN** they are styled with chalk.dim()

### Requirement: Secondary text styling
Secondary explanatory text SHALL use `chalk.dim()` for visual hierarchy.

#### Scenario: Explanatory text is dimmed
- **WHEN** output contains explanatory text like "The required controls match..."
- **THEN** it is styled with chalk.dim()

### Requirement: Error styling
Error messages SHALL use `chalk.red()`.

#### Scenario: Errors are red
- **WHEN** error message is displayed
- **THEN** it is styled with chalk.red()

