## Context

MLSpec is a new CLI tool for ML engineers who use AI agents to run experiments. The core problem: agents report metric improvements as valid conclusions without checking if the comparison itself is valid (e.g., comparing metrics from different eval splits).

This design covers the initial MVP: the `mlspec check` command that validates experiment evidence.

**Constraints:**
- Bun for development and building
- TypeScript throughout
- Target: Node.js runtime (users don't need Bun installed)
- Single CLI command initially: `check`

## Goals / Non-Goals

**Goals:**
- Create a working `mlspec check <experiment-id>` command
- Validate baseline vs candidate runs for valid comparison
- Reject comparisons where required controls don't match
- Output clear verdicts with explanations
- Support fixture-based testing of MLSpec itself

**Non-Goals:**
- Multi-command CLI (only `check` for MVP)
- Remote storage or cloud features
- Agent instruction injection (AGENTS.md is manual for MVP)
- Workspace/multi-project support

## Decisions

### 1: Directory: `.mlspec/experiments/<id>/`

**Decision:** Experiment data lives in `.mlspec/experiments/<experiment-id>/`

**Rationale:**
- Dot-prefix keeps tool data hidden, consistent with `.git`, `.github`, `.changeset`
- Not `mlspec/` (visible) - experiment data is internal, not user-facing output
- Not `fixtures/` - that's for testing MLSpec itself, not user projects

**Structure:**
```
.mlspec/
└── experiments/
    └── <experiment-id>/
        ├── experiment.yaml      # experiment definition
        └── runs/
            ├── <baseline-run>/
            │   ├── run.yaml
            │   └── metrics.json
            └── <candidate-run>/
                ├── run.yaml
                └── metrics.json
```

**Alternatives considered:**
- `mlspec/` (visible): Too much clutter in project root
- `experiments/` (visible): Could conflict with user directories

### 2: Bun + TypeScript with Node target

**Decision:** Use Bun for dev/build, bundle to Node-compatible output

**Rationale:**
- Bun is faster for development
- `bun build --target node` produces standard Node-compatible output
- Users only need Node.js installed, not Bun

**Build config:**
```typescript
// build.ts
await Bun.build({
  entrypoints: ["src/index.ts"],
  outfile: "dist/index.js",
  target: "node",
  format: "esm",
});
```

Add shebang `#!/usr/bin/env node` post-build.

### 3: Module separation

**Decision:** Separate modules for types, IO, validation logic, and CLI entry

**Structure:**
```
src/
├── index.ts      # CLI entry, arg parsing
├── types.ts      # Domain types (Experiment, Run, Metrics)
├── io.ts         # File reading (yaml, json)
├── check.ts      # Validation logic
└── ui.ts         # Output formatting (optional, for later)
```

**Rationale:**
- Clear separation of concerns
- Easy to test validation logic in isolation
- Follows the pattern the user already identified as problematic in the AI slop

### 4: Data formats

**experiment.yaml:**
```yaml
id: <experiment-id>
objective: <what we're testing>
claim:
  text: <human-readable claim>
  metric: <metric name>
  direction: increase | decrease
baseline:
  run: <baseline-run-id>
candidate:
  run: <candidate-run-id>
required_controls:
  - eval_split
  - metric_script
  - dataset
success_criteria:
  min_stage: smoke | validation | final
  require_valid_comparison: true
```

**run.yaml:**
```yaml
id: <run-id>
role: baseline | candidate
stage: smoke | validation | final
status: completed | failed
command: <what ran>
metrics_path: metrics.json
provenance:
  git_commit: <hash>
  git_dirty: true | false
  config_path: <path>
```

**metrics.json:**
```json
{
  "accuracy": 0.8,
  "loss": 0.62,
  "eval_split": "val-v1",
  "metric_script": "eval-v1",
  "dataset": "toy-dataset-v1"
}
```

### 5: Verdict output

**Three possible verdicts:**

1. **VALID COMPARISON**: All checks pass, metric improved in claimed direction
2. **INVALID COMPARISON**: Controls don't match, stages insufficient, or other validation failure
3. **CLAIM NOT SUPPORTED**: Comparison valid but metric didn't actually improve

Each verdict includes:
- Summary line
- Detailed explanation of why
- What conclusions are allowed/disallowed

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Stage ranking (smoke < validation < final) is simplistic | MVP uses fixed ranking; can add flexibility later |
| Only JSON metrics supported | Can extend to CSV/other formats later |
| Single experiment per run | Can support multiple experiments per project later |
| No caching of results | Can add later if performance becomes an issue |

## Open Questions

1. Should metrics support nested objects or only flat key-value?
2. Do we need to validate the metrics_path actually exists?
3. Should we support multiple metrics per experiment (multi-objective)?
