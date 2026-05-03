## Context

After `mlspec init --tools opencode`, the MLSpec workspace is empty (no recipes, no experiments). The skill layer (`/mlspec-explore`, `/mlspec-propose`, `/mlspec-run`, `/mlspec-resolve`, `/mlspec-next`) is the intended UX for agent-driven ML experiment management.

**Current gap**: With no recipes, skills fail or produce unhelpful output. Users must manually run CLI commands to bootstrap:
- `mlspec new recipe baseline-v1 --tag baseline`
- `mlspec tag recipe baseline-v1 current-best`
- `mlspec new experiment exp-1 --from baseline-v1 --proposes exp-1`

The intended UX is: user runs `mlspec init --tools opencode`, then works entirely through agent skills.

## Goals / Non-Goals

**Goals:**
- Agent can bootstrap a complete MLSpec workflow from empty workspace
- `/mlspec-explore` in empty workspace inspects project and recommends baseline approach
- `/mlspec-propose` in empty workspace creates root baseline recipe (not experiment)
- `/mlspec-run` with baseline-only workspace can evaluate/record baseline metrics
- Normal experiment workflow (base → proposed) works once baseline exists

**Non-Goals:**
- Do NOT add a separate `/mlspec-bootstrap` skill or command
- Do NOT modify CLI commands (remain explicit/scriptable)
- Do NOT auto-detect all project structure - reasonable heuristics only
- Do NOT create experiments during bootstrap

## Decisions

### Decision 1: Two bootstrap paths

**Greenfield** (no existing ML project):
- No training scripts, configs, or metrics
- Agent helps user define first simple baseline
- `/mlspec-explore` recommends a minimal runnable approach

**Brownfield** (existing ML project):
- Training scripts, configs, or metrics already exist
- Agent identifies existing approach by inspecting:
  - Training scripts (train.py, train.sh, etc.)
  - Config files (config.yaml, params.json, etc.)
  - Output directories
  - README or documentation
  - Metrics in logs, notebooks, W&B, MLflow (local artifacts/references only)
- Creates root baseline recipe representing current state

### Decision 2: Bootstrap vs Normal proposal

| Aspect | Bootstrap Proposal | Normal Proposal |
|--------|-------------------|-----------------|
| Creates recipe | ✅ root recipe | ❌ |
| Creates experiment | ❌ | ✅ |
| parent_recipe | `null` | `base_recipe` |
| created_by_experiment | `null` | experiment ID |
| Tags | `baseline`, `current-best` | none (resolved later) |

### Decision 3: `/mlspec-explore` empty workspace behavior

When `mlspec/recipes/` is empty:
1. Inspect project structure (training scripts, configs, data dirs)
2. If scripts found: suggest baseline recipe ID from project name
3. If no scripts: recommend a minimal starter approach
4. Remain read-only (do NOT create files)

### Decision 4: `/mlspec-propose` bootstrap mode

When no recipes exist:
1. Infer baseline recipe ID from project or ask user
2. Create root recipe: `mlspec new recipe <id> --tag baseline`
3. Tag as current-best: `mlspec tag recipe <id> current-best`
4. For brownfield: attempt best-effort metric discovery from local files
5. If metrics unknown: leave empty, recommend evaluation run

### Decision 5: `/mlspec-run` baseline evaluation mode

When recipes exist but no experiments:
1. Check if baseline/current-best recipe has metrics
2. If no metrics: suggest running evaluation to establish baseline
3. In baseline-only mode, update `recipes/<id>/recipe.yaml` top-level `metrics` field
4. May update `recipes/<id>/summary.md`
5. Must NOT create experiment evidence files
6. Experiment evidence remains only under `mlspec/experiments/<id>/evidence/`

## Bootstrap State Machine

```
┌─────────────────┐
│ Empty Workspace │
└────────┬────────┘
         │ /mlspec-explore
         ▼
┌─────────────────────────────────────┐
│ Inspects project                    │
│ Recommends baseline approach         │
│ (read-only)                        │
└─────────────────────────────────────┘
         │
         ▼ /mlspec-propose <baseline-id>
┌─────────────────────────────────────┐
│ Creates root recipe                 │
│ - parent_recipe: null              │
│ - created_by_experiment: null        │
│ - tags: [baseline, current-best]   │
└─────────────────────────────────────┘
         │
         ▼ /mlspec-run (optional)
┌─────────────────────────────────────┐
│ Updates recipe.yaml metrics         │
│ Updates summary.md if appropriate   │
│ (NOT experiment evidence files)       │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Workspace with baseline recipe      │
│ Ready for experiment proposals      │
└─────────────────────────────────────┘
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Baseline ID and approach are obvious | Proceed without asking; show inferred action first |
| Baseline ID or approach genuinely ambiguous | Ask one focused question |
| No scripts found in project | Recommend starter approach explicitly |
| Brownfield metrics unavailable | Leave empty, note as pending |

## Resolved Decisions

### Baseline ID heuristic
Infer from: project name, config/model name, or `baseline-v1` fallback.

### Metrics discovery
Best-effort from local files only:
- outputs, results, logs
- notebooks
- README or documentation
- configs with metric references
- Local W&B/MLflow artifacts or references if present

No external service access required.

### Next-action rule after bootstrap
- If baseline metrics are missing: suggest `/mlspec-run` to establish metrics
- Otherwise: suggest `/mlspec-explore` or `/mlspec-propose` for first experiment
