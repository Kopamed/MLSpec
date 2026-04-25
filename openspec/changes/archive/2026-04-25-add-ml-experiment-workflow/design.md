## Context

OpenSpec provides a spec-driven workflow for software changes. Its core abstractions are:

- **Change**: A container for artifacts (proposal, specs, design, tasks) that tracks one logical piece of work
- **Artifact**: A file generated from a schema template with dependencies on other artifacts
- **Schema**: Defines artifact types, templates, dependencies, and generation rules
- **Archive**: Moves a completed change to archive and merges delta specs into canonical specs

The `openspec/` workspace structure is:
```
openspec/
├── config.yaml
├── specs/           # Canonical requirements
├── changes/        # Active changes
└── changes/archive/ # Completed changes
```

ML experimentation has fundamentally different needs:

| Software OpenSpec | ML Experimentation |
|-------------------|-------------------|
| Change modifies canonical state | Experiment compares against baselines/recipes |
| Linear artifact chain (proposal→specs→design→tasks) | Branching with early death (experiments can die at E1) |
| Implementation is the work | Evidence interpretation and decisions are the work |
| One canonical final state | Multiple competing recipes simultaneously |
| Archive merges deltas | Archive freezes decision, candidate evolves separately |
| Binary task completion | Continuous evidence quality levels |

### The Core Problem MLSpec Solves

ML experimentation fails when teams:
1. Skip formal hypothesis formation
2. Treat tiny proxy experiments (10% data, 5 epochs) as if they predict full-scale results
3. Combine "winning" tricks without testing interactions
4. Lack explicit promote/reject decision records
5. Lose institutional knowledge when experiments die silently

MLSpec provides structure for the **thinking layer** while leaving the **execution layer** (training runs, metrics, artifacts) to existing tools (W&B, MLflow, DVC, etc.).

## Goals / Non-Goals

**Goals:**
- Provide a repo-native workspace (`mlspec/`) for ML experimentation with clear organizational structure
- Define evidence levels (E0–E5) as first-class metadata, not just conventions
- Support the full experiment lifecycle: hypothesis → evidence → decision → promote/reject → archive
- Enable versioned candidate recipes with draft/finalized semantics
- Validate structural correctness without making ML quality judgments
- Reuse OpenSpec's schema engine, template system, and archive mechanics where appropriate
- Integrate with the existing `openspec` CLI via `openspec ml` subcommand

**Non-Goals:**
- Build a run tracker (W&B/MLflow/DVC already do this)
- Replace training frameworks or config management (Hydra, etc.)
- Automatically execute training or generate training code
- Make automated ML quality decisions
- Provide dashboards or visualizations
- Support Kaggle-only workflows (generic across classification, regression, NLP, vision, etc.)

## Decisions

### Decision 1: MLSpec as Separate Workspace, Not Software Change

**Choice**: MLSpec uses a separate `mlspec/` workspace directory, not the existing `openspec/` workspace.

**Rationale**: The mental models are fundamentally different. Mixing them would cause confusion about which workspace rules apply. Separate workspaces also allow MLSpec to evolve independently without affecting software development workflows.

**Alternative considered**: Use `openspec/` with different schemas. Rejected because:
- `openspec/` is strongly associated with software requirements
- The `openspec/changes/` structure assumes change-centric lifecycle
- Cross-contamination risk between software and ML artifacts

**Delivery**: Initially as `openspec ml` subcommand for faster MVP, but architected as a separable ML workspace using shared core utilities.

---

### Decision 2: Evidence Levels as Frontmatter Tags, Not Schema Artifacts

**Choice**: Evidence levels are declared in YAML frontmatter of evidence files, not as separate required schema artifacts.

**Rationale**: MLSpec experiments don't follow a rigid E1→E2→E3 chain. An experiment might:
- Die at E1 (rejected)
- Skip E1 and start at E2 (valid if E1 was clearly unnecessary)
- Have E1, E2, E3 all showing different patterns (interesting finding)

Making each evidence level a separate required artifact would enforce a rigid chain that doesn't match ML reality.

**Schema structure**:
```yaml
artifacts:
  - id: evidence
    generates: "evidence/*.md"  # Glob matches any number of evidence files
```

**Evidence file frontmatter**:
```yaml
---
evidence_level: E2
recommendation: promote
comparison_ref:
  entity_type: baseline
  name: baseline-v1
metrics:
  auc_delta: 0.007
  f1_delta: 0.004
compute:
  dataset_fraction: 0.25
  epochs: 15
  folds: 3
  image_size: 384
---
```

**Note**: `comparison_ref` uses `entity_type` to indicate whether comparing against a baseline or candidate. The `compute` object contains domain-relevant fields; `image_size` is included here as an example for vision tasks.

**Note**: Evidence files use `recommendation` to indicate what this evidence level suggests. The final `decision.md` uses `decision` for the authoritative outcome.

**Alternative considered**: E1, E2, E3 as separate artifact types with requires chains. Rejected because it forces rigid progression that doesn't match ML experimentation reality.

---

### Decision 3: Candidate Recipe Versioning with Draft/Finalized Status

**Choice**: Candidate recipes are versioned with explicit draft/finalized semantics, tracked in `.candidate.yaml` metadata.

**Rationale**: ML recipes evolve as new evidence supports changes, but historical reproducibility matters. A new version should be clearly distinguishable from an immutable finalized version.

**Structure**:
```yaml
# mlspec/candidates/candidate-a/.candidate.yaml
entity_type: candidate
name: candidate-a
current_version: 2
latest_finalized_version: 1
versions:
  - version: 1
    file: recipe-v1.yaml
    status: finalized
    created: 2026-04-01
  - version: 2
    file: recipe-v2.yaml
    status: draft
    created: 2026-04-24
    created_from: 1
    supporting_experiments:
      - exp-017-cutmix
```

**No symlinks**: The `current_version` field is resolved through metadata, not filesystem symlinks, to avoid cross-platform issues.

**`current_version` vs `latest_finalized_version`**: `current_version` always points to the latest working version (which may be draft). `latest_finalized_version` optionally tracks the highest finalized version for quick reference.

**Alternative considered**: Symlinks for `current`. Rejected because symlinks cause problems on Windows and in certain git configurations.

---

### Decision 4: Promotion Does Not Implicitly Archive

**Choice**: `promote` and `archive` are separate operations. Promotion updates candidate recipe metadata. Archiving moves the experiment to archive subdirectories.

**Rationale**: These are conceptually distinct:
- **Promote**: Updates the candidate recipe to incorporate new evidence
- **Archive**: Freezes the experiment record and moves it to archive/

Separating them allows:
- Promoting multiple experiments before archiving any
- Archiving rejected experiments without promotion
- Keeping the decision record separate from the recipe evolution

**Workflow**:
```
hypothesis
→ evidence
→ decision
→ promote (if decision: promote)
→ archive
```

**Archive subdirectories**:
- `archive/promoted/` — decision: promote
- `archive/rejected/` — decision: reject
- `archive/inconclusive/` — decision: inconclusive
- `archive/held/` — decision: hold
- `archive/retry/` — decision: retry

---

### Decision 5: Validation Distinguishes Errors from Warnings

**Choice**: Validation treats structural problems as errors, but ML quality concerns as warnings.

**Errors (blockers)**:
- Malformed YAML
- Missing required frontmatter fields
- Broken entity references (baseline_ref, candidate_ref pointing to non-existent entities)
- Invalid evidence_level enum
- Decision references evidence files that don't exist
- `promote` decision without `target_candidate`

**Warnings (recommendations)**:
- E2 worse than E1 (transfer failure possible, not invalid)
- Only E1 evidence but decision is `promote` (thin evidence, not blocked)
- Skipped E1 and started at E2 (unusual, but valid)
- Single seed only (low robustness, flagged)
- Deprecated baseline reference (use superseded baseline)

**Rationale**: The tool should not pretend to understand ML truth. It can detect structural problems and flag suspicious patterns, but ML quality decisions belong to humans.

---

### Decision 6: Findings Present from MVP, Synthesis Manual

**Choice**: The `findings/` directory and templates exist in MVP, but automatic synthesis is out of scope.

**Rationale**: Findings are the ML equivalent of OpenSpec's canonical specs — synthesized institutional knowledge. However, automatic synthesis is complex and error-prone. MVP provides the structure; humans (with AI assistance) maintain findings manually.

**Structure**:
```
mlspec/findings/
├── augmentation.md
├── losses.md
├── data.md
├── architecture.md
└── training.md
```

**Archive/Promote reminder**: When archiving or promoting, the CLI prints:
```
Consider updating findings/augmentation.md with this result.
```

---

### Decision 7: ReferenceResolver for Cross-Entity Validation

**Choice**: Build a ReferenceResolver that scans the workspace and indexes all entities, enabling validation of cross-references.

**Rationale**: Unlike OpenSpec where changes only reference other changes within the same directory, MLSpec experiments reference baselines, candidates, and other experiments. We need a system to validate these references.

**Implementation**:
```typescript
class ReferenceResolver {
  constructor(workspaceRoot: string) {}
  scan(): void  // Index all entities in workspace
  resolve(type: EntityType, name: string): Entity | null
  validateRefs(entity: Entity): ValidationResult[]
}
```

---

### Decision 8: Validation Levels (E0–E5) Are Generic

**Choice**: Evidence levels are defined generically, not tied to specific metrics or thresholds.

**Rationale**: MLSpec should work across ML domains (classification, regression, NLP, vision, etc.). The specific meaning of E1/E2/E3 depends on the problem and dataset.

**Generic definitions**:
- **E0**: Hypothesis only (idea stage)
- **E1**: Cheap proxy test (smoke test — does it have any signal?)
- **E2**: Controlled small experiment (is it real and reproducible?)
- **E3**: Medium-scale validation (does it transfer at realistic scale?)
- **E4**: Full cross-validation / near-final validation
- **E5**: Final production/submission candidate

**Kaggle-specific guidance** can be added in templates without hardcoding in schema.

## Risks / Trade-offs

- [Risk] Two workspaces (`openspec/` and `mlspec/`) in the same repo may cause confusion → Mitigation: Clear documentation, separate CLI subcommands, distinct directory names
- [Risk] Evidence levels are subjective and may be misused → Mitigation: Templates include guidance on appropriate evidence levels for each experiment type
- [Risk] Findings may become stale if not maintained → Mitigation: Archive/promote reminders, periodic validation can flag stale findings
- [Risk] MVP promote doesn't auto-patch YAML configs → Mitigation: Human/agent edits recipe YAML after promotion; future work can add auto-patching
- [Risk] No W&B integration means raw runs stay in W&B → Mitigation: This is intentional; MLSpec stores the interpretation layer, not raw metrics

## Open Questions

- Should MLSpec self-host an example `mlspec/` workspace in this repo to demonstrate the workflow?
- How should we handle the transition if users want to migrate from another experiment tracking system?
- Do we need a way to "fork" or "branch" a candidate recipe for parallel exploration?
