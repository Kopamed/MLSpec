## Context

MLSpec's current output is unstructured text printed directly to stdout. This doesn't support:
- Machine parsing (CI/CD pipelines, scripts)
- Alternative output formats for different consumers
- Testing (can't easily verify output)

Also need to add test infrastructure for fixtures and implement `mlspec init`.

## Goals / Non-Goals

**Goals:**
- Refactor check command to use structured internal result type
- Support multiple renderers: human (default), JSON, XML
- Update experiment directory from `.mlspec/` to `mlspec/`
- Implement `mlspec init` to create `mlspec/` directory
- Add two adversarial fixtures
- Add automated test suite for fixtures

**Non-Goals:**
- AGENTS.md (not needed)
- Versioning JSON output
- Config options for default format
- Verdict type expansion (keep VALID/INVALID/NOT_SUPPORTED)

## Decisions

### 1: Structured Result Type

**Decision:** `checkExperiment` returns a structured `Result` object. Renderers consume this and produce formatted output.

```typescript
interface CheckResult {
  verdict: "VALID" | "INVALID" | "NOT_SUPPORTED";
  experimentId: string;
  objective: string;
  claim: { metric: string; direction: string };
  baselineMetric?: number;
  candidateMetric?: number;
  metricImproved?: boolean;
  failures: Array<{
    type: string;
    message: string;
    details?: { field?: string; baseline?: unknown; candidate?: unknown; };
  }>;
}
```

**Rationale:** Pure data separation allows multiple renderers without changing core logic.

### 2: Renderer Interface

**Decision:** Each renderer implements a simple interface:

```typescript
interface Renderer {
  render(result: CheckResult): string;
}
```

**Renderers:**
- `HumanRenderer` - default, minimal terminal output
- `JsonRenderer` - JSON output
- `XmlRenderer` - XML output

### 3: CLI Flag Design

**Decision:** Use `--json` and `--xml` as boolean flags.

```
mlspec check <experiment>        # human (default)
mlspec check <experiment> --json # JSON output
mlspec check <experiment> --xml  # XML output
```

**Rationale:** Short and convenient. User requested `--json` specifically.

### 4: Human Renderer Design

**Decision:** Left-aligned, minimal design:

```
MLSpec check: eos-test

Objective: Test whether adding EOS handling improves generation termination.
Claim: Candidate improves generation termination compared to baseline.

✓ VALID COMPARISON

  accuracy
  baseline:  0.80
  candidate: 0.91

  The required controls match and the target metric improved.
```

**For INVALID:**
```
✗ INVALID COMPARISON

  accuracy
  baseline:  0.80
  candidate: 0.91

  Why:
  • Control mismatch: eval_split
    baseline:  val-v1
    candidate: train-v1

  Allowed:
  • Candidate produced higher metric in its run

  Disallowed:
  • Candidate is better than baseline
```

**Design principles:**
- No borders, left-aligned
- Uppercase verdicts
- Simple symbols: ✓ ✗ ⚠
- Color only on verdict symbol (green/red/yellow)
- Blank lines for spacing

### 5: Directory Change `.mlspec/` → `mlspec/`

**Decision:** Change experiment root from `.mlspec/` to `mlspec/`

**Rationale:** `mlspec/` is a visible scientific record committed to git. Not hidden tool data.

### 6: Fixture Test Suite

**Decision:** Use vitest (already in dependencies). Each fixture has `expected.txt` with expected output substring.

```typescript
test("001-eval-split-mismatch", async () => {
  const result = await exec(`node dist/index.js check eos-test --root fixtures/001-eval-split-mismatch`);
  const expected = readFileSync("fixtures/001-eval-split-mismatch/expected.txt", "utf8");
  expect(result.stdout).toContain(expected.trim());
});
```

**Rationale:** Simple, no new dependencies, readable.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking change: `.mlspec/` → `mlspec/` | Existing users will need to rename directory |
| Test fragility if output text changes | Use substring matching, not exact match |

## Open Questions

None.
