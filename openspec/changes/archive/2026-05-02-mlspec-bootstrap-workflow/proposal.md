## Why

After `mlspec init --tools opencode`, users must manually run low-level CLI commands to create the first baseline recipe. The intended UX is that the agent manages MLSpec through skills after initialization, without requiring manual CLI commands.

## What Changes

- **`/mlspec-explore`** in empty workspace: Detects no recipes exist, inspects project, recommends first baseline approach (read-only)
- **`/mlspec-propose`** in empty workspace: Creates first root baseline recipe when no recipes exist (bootstrap mode)
- **`/mlspec-run`** in baseline-only workspace: Can run or record baseline recipe evaluation without requiring an experiment
- Normal proposal and experiment workflow unchanged once baseline exists

### Bootstrap vs Normal Proposal

| Scenario | Base Exists | Creates Recipe | Creates Experiment |
|----------|-------------|---------------|-------------------|
| Bootstrap (no recipes) | N/A | ✅ root recipe with `parent_recipe: null` | ❌ |
| Normal experiment | ✅ | ❌ | ✅ |

### Greenfield vs Brownfield Paths

**Greenfield** (no existing ML project):
- No training scripts, configs, or metrics yet
- Agent helps define the first simple baseline

**Brownfield** (existing ML project):
- Training scripts, configs, or prior metrics already exist
- Agent identifies existing approach and wraps it as baseline recipe
- Tries to discover metrics from local outputs, logs, notebooks, config files, README, and local W&B/MLflow artifacts or references if present
- No external service access is required

## Capabilities

### New Capabilities
- `mlspec-bootstrap-workflow`: Bootstrap behavior for `/mlspec-explore`, `/mlspec-propose`, and `/mlspec-run` in empty/baseline-only workspaces

### Modified Capabilities
- `mlspec-v2-skill-layer`: Add bootstrap behavior requirements to explore, propose, and run skills

## Impact

- Skills: `mlspec-explore`, `mlspec-propose`, `mlspec-run`, `mlspec-next`
- Skill templates: `src/core/templates/workflows/mlspec-*.ts`
- Tests: Bootstrap scenarios for fresh workspace initialization
