## Context

MLSpec currently uses `picocolors` for terminal output. The current styling is minimal - only verdict symbols are colored. OpenSpec uses `chalk` with a hierarchical aesthetic that creates visual hierarchy through color and weight.

## Goals / Non-Goals

**Goals:**
- Replace picocolors with chalk
- Adopt OpenSpec's aesthetic hierarchy
- Improve readability through thoughtful color use

**Non-Goals:**
- Don't add decorations or unnecessary styling
- Keep output clean and scannable

## Decisions

### 1: Use chalk instead of picocolors

**Decision:** Replace picocolors with chalk

**Rationale:**
- chalk is more widely used and maintained
- chalk's API supports bold, dim, and other styles better
- OpenSpec uses chalk, maintaining aesthetic consistency

**Alternatives considered:**
- picocolors: Already using, but less featured than chalk
- ANSI escape codes directly: Too verbose, error-prone

### 2: OpenSpec Aesthetic Hierarchy

**Decision:** Adopt OpenSpec's color hierarchy approach:

| Style | Usage |
|-------|-------|
| `white.bold` | Headers (e.g., "MLSpec check: eos-test") |
| `dim` | Labels (e.g., "Objective:", "Claim:", "Why:") |
| `green` | VALID verdict symbol and text |
| `red` | INVALID verdict symbol and text |
| `yellow` | NOT_SUPPORTED verdict symbol and text |
| `white` | Regular text, values |
| `red` (plain) | Error messages |

### 3: Error Output

**Decision:** Use `chalk.red('ERROR: ${message}')` for errors

**Rationale:** Errors should stand out clearly from normal output.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users who preferred minimal styling | chalk's styles are subtle, not garish |
| Color contrast issues | Test on common terminals |
