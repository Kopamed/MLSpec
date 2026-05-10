# Human Renderer

## ADDED Requirements

### Requirement: Left-aligned output
The human renderer SHALL output left-aligned text without borders or box-drawing characters.

### Requirement: Uppercase verdicts
Verdicts SHALL be displayed in uppercase:
- "VALID COMPARISON"
- "INVALID COMPARISON"
- "CLAIM NOT SUPPORTED"

### Requirement: Simple verdict symbols
The human renderer SHALL use simple ASCII symbols:
- ✓ (green) for VALID
- ✗ (red) for INVALID
- ⚠ (yellow) for NOT_SUPPORTED

### Requirement: Color only on verdict
Color SHALL only be applied to the verdict symbol. All other text SHALL be uncolored.

### Requirement: Blank line separation
Sections SHALL be separated by blank lines for readability.

### Requirement: Valid comparison output format
For VALID verdict:
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

### Requirement: Invalid comparison output format
For INVALID verdict:
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

### Requirement: Claim not supported output format
For NOT_SUPPORTED verdict:
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
