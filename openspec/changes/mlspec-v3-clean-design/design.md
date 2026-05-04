# Design: MLSpec V3 Clean Design

## Context

MLSpec V2 currently uses hard-coded evidence stages (smoke/validation/final) defined by `EvidenceStageSchema`. This schema appears in 332+ locations across the codebase and encodes semantics that conflate engineering concerns with scientific evidence:

- "Smoke" means "does it run?" - an engineering check, not empirical evidence
- Evidence stages are hard-coded even though different experiments may need different ladders
- Resolution cannot represent partial success (mechanistic failure + practical utility)

The V2 lifecycle is: propose → run evidence (smoke → validation → final) → resolve. There's no explicit Prepare stage, no per-rung baselines, and no separation between mechanistic and practical outcomes.

## Goals / Non-Goals

**Goals:**
- Replace hard-coded smoke/validation/final with user-defined evidence ladder
- Add explicit Prepare stage for engineering readiness verification
- Enable per-rung baseline requirements (pilot baseline differs from validation baseline)
- Separate mechanistic hypothesis outcome from practical utility outcome in resolution
- Clean breaking change (no backwards compatibility)

**Non-Goals:**
- Implementing ML training/benchmarking in CLI (skills perform this)
- CLI invoking skills (skills are agent prompts, not CLI commands)
- Providing project-specific templates (users define their own training scripts)
- Multi-experiment comparison workflows (ablation studies)
- External benchmark integration (MMLU, WMDP)
- Automated experiment generation

## Architecture: CLI vs Skills

### CLI (TypeScript Binary)

The MLSpec CLI is a **validation and state management tool**. It does NOT:
- Invoke skills
- Run training
- Execute benchmarks
- Perform transform correctness checks
- Make ML-specific decisions

The CLI **does**:
- Validate artifact schemas (protocol.md, prepare.md, evidence/<rung>.md, resolution.md)
- Enforce state transitions (draft → running → resolved)
- Validate artifact paths
- Enforce gating (prepare.md status, can_resolve flag)
- Return exit codes based on validation state

### Skills (Agent Prompts)

Skills in `src/core/templates/workflows/*.ts` are **agent prompts/templates** that:
- Get installed to `.opencode/skills/<skill-name>/SKILL.md`
- Are read by agents when invoked
- Tell agents what to do and how to do it
- Include guardrails and pause conditions

Skills perform all project-specific ML work:
- Transform implementation
- Transform correctness verification
- Benchmark script implementation
- Training startup checks
- Model training
- Benchmark execution
- Metrics collection
- Evidence file writing

## Decisions

### Decision 1: CLI vs Skill Responsibility Boundary

**CLI Responsibilities:**
- Schema validation
- State machine enforcement
- Artifact path validation
- Gating enforcement (prepare.md ready, can_resolve satisfied)
- Workspace structure validation
- Exit code mapping

**Skill Responsibilities:**
- Transform implementation and verification
- Benchmark implementation
- Training execution (≤100 step startup checks)
- Full model training
- Benchmark execution
- Metrics collection
- Evidence file writing
- Outcome assessment

**Rationale:** CLI must remain tool-agnostic. Skills are agent prompts that guide ML-specific work. CLI validates artifacts and gates; skills perform work.

### Decision 2: Prepare Workflow

**Agent Workflow:**
```
Agent reads /mlspec-prepare skill
  → Skill instructs: implement transform, verify correctness, run startup checks
  → Agent performs checks
  → Agent writes prepare.md
  → Agent runs: mlspec validate
  → CLI validates prepare.md schema and status
```

**CLI Command:**
```
mlspec prepare <experiment>
  → Validates prepare.md exists
  → Validates prepare.md schema
  → Returns exit code based on status field
```

### Decision 3: Evidence Ladder Structure

**Choice:** Each rung in `protocol.md.evidence_ladder` defines:
- `id`: User-defined rung identifier (e.g., "pilot", "validation")
- `budget`: model_params, training_tokens, eval_tokens
- `arms`: baseline_arm and treatment_arm with config_overrides
- `benchmark`: dataset and metrics (same for both arms)
- `comparison`: comparison_required, comparison_metric, success_threshold
- `abort_criteria`: conditions for early termination
- `can_resolve`: whether this rung can resolve the experiment

**Rationale:** This structure enables:
- Per-rung baselines (different token budgets may require different baselines)
- Explicit comparison requirement (some rungs may be pilot-only)
- Abort criteria per rung (cheap runs may abort faster)
- Clear can_resolve semantics (pilot cannot resolve, validation can)

### Decision 4: Prepare Stage Scope (Skill Work)

**Choice:** mlspec-prepare skill performs:
- Transform implementation correctness (data interventions)
- Benchmark script functionality
- Training command startup (≤100 steps)
- Baseline availability per rung

The skill does NOT:
- Train full baseline models (expensive, belongs in evidence)
- Perform empirical comparisons
- Change intervention/benchmark/metric/data semantics

**Rationale:** Expensive comparison work belongs in evidence collection. Prepare is a gate to catch engineering issues.

### Decision 5: Resolution Separation

**Choice:** `resolution.md` contains:
- `mechanistic_outcome`: { hypothesis, result: success|failure|inconclusive, evidence_ref, notes }
- `practical_outcome`: { hypothesis, result: positive|negative|inconclusive|variant_accepted, evidence_ref, notes }
- `resolution`: accept|reject|hold|retry

**Rationale:** Many ML experiments have this pattern:
- Mechanistic hypothesis: "Adding EOS tokens will produce explicit EOS in generation" → FAILS
- Practical utility: "Perplexity improves" → SUCCEEDS

Separated outcomes capture this cleanly.

### Decision 6: Artifact File Structure

```
experiments/<id>/
├── experiment.yaml    # Status, base_recipe, proposed_recipe
├── hypothesis.md     # Human-readable hypothesis text
├── protocol.md       # Evidence ladder, compute agreement, baseline requirements
├── prepare.md        # Engineering readiness verification (written by agent)
├── resolution.md     # Final decision with separated outcomes (written by agent)
└── evidence/
    └── <rung-id>.md  # Rung-specific evidence (written by agent)
```

**Rationale:** Protocol frozen at proposal; prepare is transient verification; evidence accumulates per rung. Skills write artifacts; CLI validates schemas.

### Decision 7: Schema Migration

**Choice:** V3 schemas use `schema: ml-experiment-v3` and are entirely new structures.

**Rationale:** Clean break enables complete EvidenceStageSchema removal and clean evidence_ladder without legacy defaults.

## Risks / Trade-offs

[Risk: Users must learn new workflow] → Mitigation: Clear AGENTS.md documentation, skill templates guide agent behavior

[Risk: Per-rung baselines increase storage] → Mitigation: Baselines are recipe artifacts, can be shared

[Risk: Protocol.md is more complex than evidence_plan] → Mitigation: Skills help design appropriate ladders

[Risk: Breaking change for existing users] → Accepted: V3 is beta; clean break enables architectural improvement

## Open Questions

**Q: How does CLI validate rung exists in protocol?**
A: CLI reads protocol.md at run time, validates rung ID against evidence_ladder[].id

**Q: Can agents skip Prepare?**
A: CLI enforces prepare.md exists and status=ready before allowing evidence run

**Q: How are training scripts located?**
A: Skills handle project-specific training. CLI doesn't know about training scripts.

**Q: Does V3 support multi-seed runs?**
A: Each arm's runs array supports multiple seeds; aggregation happens in evidence file
