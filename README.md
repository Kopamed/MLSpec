# MLSpec

ML Experiment Validity Layer — a CLI control plane for ML experiment governance that grades evidence by resource consumption and gates decisions by what evidence can actually support.

## Features

- **Compute-aware evidence grading**: CLI computes evidence grade from resource ratio; agents cannot claim grades
- **Decision gating**: Accept/reject decisions require passing invariant checks
- **Adversarial fixtures**: Built-in tests that verify overclaiming is blocked
- **Storage abstraction**: SQLite (Node.js) or JSONL (Bun) adapters via repository interface

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/mlspec.git
cd mlspec

# Install dependencies
bun install

# Build
bun build.ts
```

## Quick Start

### 1. Initialize

```bash
mkdir my-experiment
cd my-experiment
mlspec init
```

### 2. Frame a Case

```bash
mlspec case create \
  --question "Does attention mechanism improve accuracy on CIFAR-10?" \
  --mode decision \
  --actor-ref agent-1 \
  --json
```

### 3. Draft a Protocol

```bash
mlspec protocol draft \
  --case-id <case-id> \
  --objective "Improve CIFAR-10 accuracy" \
  --metric-name accuracy \
  --metric-direction max \
  --metric-split test \
  --gpu-hours 10 \
  --wallclock-hours 12 \
  --data-fraction 1.0 \
  --seeds 5 \
  --epochs 100 \
  --actor-ref agent-1 \
  --json
```

### 4. Create Snapshot

```bash
mlspec snapshot create \
  --case-id <case-id> \
  --commit-hash $(git rev-parse HEAD) \
  --dirty-tree false \
  --actor-ref agent-1 \
  --json
```

### 5. Run Experiment

```bash
# Begin run
mlspec run begin \
  --case-id <case-id> \
  --protocol-id <protocol-id> \
  --snapshot-id <snapshot-id> \
  --kind full \
  --command "python train.py --epochs 100" \
  --actor-ref agent-1 \
  --json

# End run (after execution)
mlspec run end \
  --run-id <run-id> \
  --status completed \
  --gpu-hours 10 \
  --wallclock-hours 11.5 \
  --data-fraction 1.0 \
  --seeds 5 \
  --epochs 100 \
  --output-refs "gs://my-bucket/model.pt" \
  --json
```

### 6. Classify Evidence

```bash
mlspec evidence classify \
  --case-id <case-id> \
  --run-ids <run-id> \
  --json
```

### 7. Run Audit

```bash
mlspec audit run --case-id <case-id> --json
```

### 8. Issue Decision

```bash
mlspec claim create \
  --case-id <case-id> \
  --statement "Attention mechanism improves accuracy by >2%" \
  --scope global \
  --expected-direction max \
  --target-metric accuracy \
  --actor-ref agent-1 \
  --json

mlspec decision issue \
  --case-id <case-id> \
  --claim-id <claim-id> \
  --status accept \
  --evidence-ids <evidence-id> \
  --rationale "Decision grade evidence with comparable baseline and variance across 5 seeds" \
  --actor-ref agent-1 \
  --json
```

## Evidence Grades

| Grade | Requirement | Additional Conditions |
|-------|-------------|------------------------|
| `smoke` | < 10% of planned GPU-hours | May have no comparator |
| `proxy` | 10-30% of planned compute | Comparator helpful but not required |
| `partial` | 30-99% OR full with missing baseline/variance/deviation | Split and metric explicit |
| `decision_grade` | >= 100% on gpu_hours, data_fraction, epochs, seeds | Matched baseline, evaluator digest, variance reported (multiple seeds), no unresolved deviations |
| `replicated` | decision_grade + explicit replication strategy satisfied | Independent rerun or second seed bundle |
| `invalid` | Fatal deviation, lineage hole, noncomparable baseline | None |

## Store Adapters

### JSONL (Bun, default)

```bash
MLSPEC_STORE=adapter=jsonl mlspec case create ...
```

Events are written to `.mlspec/cases/<case-id>/events.jsonl`.

### SQLite (Node.js)

```bash
# Install better-sqlite3 for Node.js
npm install better-sqlite3

MLSPEC_STORE=adapter=sqlite mlspec case create ...
```

Data is stored in `.mlspec/store.db`.

## JSON Envelope Format

All CLI commands return a JSON envelope:

**Success:**
```json
{
  "ok": true,
  "command": "case.create",
  "data": { ... },
  "warnings": [],
  "meta": { "schema_version": "0.1.0" }
}
```

**Failure:**
```json
{
  "ok": false,
  "command": "decision.issue",
  "code": "INSUFFICIENT_EVIDENCE",
  "message": "Claim cannot be resolved as accept/reject.",
  "data": { ... },
  "blocking_invariants": ["BASELINE_NOT_COMPARABLE", "RESOURCE_UNDERRUN"],
  "suggested_next_actions": ["rerun with protocol-required seeds=5"],
  "meta": { "schema_version": "0.1.0" }
}
```

## OpenCode Skills

MLSpec provides skills for AI agents:

- `ml-spec-frame-case`: Define questions and draft protocols
- `ml-spec-run-candidate`: Execute structured experiments
- `ml-spec-decide-case`: Issue bounded decisions
- `ml-spec-audit-case`: Run invariant audits

See `.opencode/skills/` for skill contracts.

## Running Tests

```bash
# Run adversarial fixtures
bun test/src/__fixtures__/

# Or directly
bun src/__fixtures__/index.ts
```

## License

MIT