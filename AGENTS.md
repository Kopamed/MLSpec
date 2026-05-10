# MLSpec

CLI tool for ML engineers to validate experiment evidence before accepting results.

## Core Insight

**metric improved ≠ evidence valid**

MLSpec checks whether a claimed improvement has valid supporting evidence.

## Commands

```bash
bun src/index.ts check <experiment-id>   # Run check
bun build.ts                              # Build CLI
node dist/index.js check <experiment-id>  # Run built CLI
npm link                                  # Link mlspec globally
```

## Project Structure

```
src/
├── index.ts    # CLI entry, argument parsing
├── types.ts    # Domain types (Experiment, Run, Metrics, Verdict)
├── io.ts       # File reading (YAML, JSON)
├── check.ts    # Validation logic, returns structured Result
fixtures/       # Adversarial test cases (fake ML projects)
```

## MLSpec Directory

Experiments live in `mlspec/experiments/<id>/` (not `.mlspec/`):

```
mlspec/experiments/<id>/
├── experiment.yaml    # experiment definition
└── runs/
    ├── baseline-run/
    │   ├── run.yaml
    │   └── metrics.json
    └── candidate-run/
        ├── run.yaml
        └── metrics.json
```

## Output Formats

- Human (default): left-aligned, uppercase verdicts, ✓ ✗ ⚠ symbols
- `--json`: machine-parseable JSON
- `--xml`: XML output

## Fixture Testing

Each fixture is a fake project that tests MLSpec's ability to catch bad conclusions:

- `fixtures/001-eval-split-mismatch/` - candidate uses different eval split
- `fixtures/002-metric-script-mismatch/` - candidate uses different metric script
- `fixtures/003-smoke-promoted-as-validation/` - smoke evidence claimed as validation

Fixtures have `fixture.yaml` with `expected.verdict` and `expected.failed_checks` (not `expected.txt`).

**Static tests** (default): `npm test` or `vitest run` - runs directly against fixtures
**Agent tests** (explicit): `vitest run test/fixtures.agent.test.ts` - launches Claude Code, slower

Static tests point `--root` at `fixtures/<id>/environment/` where mlspec data lives.

## Development

- Use **Bun** for development (faster)
- Build outputs Node-compatible CLI via `bun build.ts`
- TypeScript throughout, NodeNext module resolution
- **Build first**: `bun build.ts` before running `node dist/index.js` or tests
- **ESM project**: `"type": "module"` in package.json; imports require `.js` extensions

## OpenSpec Workflow

- `/opsx-propose <name>` - Create new change proposal
- `/opsx-apply` - Implement tasks for current change
- `/opsx-archive` - Archive completed change (syncs specs via CLI)

**Mandatory validation**: After creating or modifying any openspec artifacts, run:
```bash
openspec validate --changes <change-name>
```
Validation MUST pass before archiving. If validation fails, fix the issues before proceeding.

**Archive command**: `openspec archive <name> --yes`
- The CLI syncs delta specs to `openspec/specs/`
- Validation validates the *rebuilt* spec, not just delta. All requirements in main spec need proper scenarios with SHALL/SHALL NOT keywords
- If validation fails, fix the delta spec headers to match existing requirements exactly
- MODIFIED requirements must already exist in main spec
- ADDED requirements are new and don't need to exist yet

## Human Design Language (OpenSpec Aesthetic)

Uses chalk for terminal styling with visual hierarchy:

| Style | Usage |
|-------|-------|
| `white.bold` | Headers (e.g., "MLSpec check: eos-test") |
| `dim` | Labels (Objective:, Claim:, Why:, etc.) |
| `green` | ✓ VALID COMPARISON |
| `red` | ✗ INVALID COMPARISON, errors |
| `yellow` | ⚠ CLAIM NOT SUPPORTED |
| `dim` | Explanatory text |

- Left-aligned, no borders
- Uppercase verdicts
- Colors create hierarchy, not decoration
