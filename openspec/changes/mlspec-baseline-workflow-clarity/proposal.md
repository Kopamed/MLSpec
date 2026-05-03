## Why

MLSpec's workflow skills exist but do not make the distinction between baseline evaluation, experiment evidence, and next-action routing prominent enough. In dogfood testing, an agent confused "establish baseline quality" (evaluation work) with "run experiment evidence" (experiment work), chose wrong model scales, and produced inline snippets instead of durable scripts. The skills have the necessary guidance but it is not surfaced with sufficient prominence or enforcement.

## What Changes

- **mlspec-next**: Clarify routing for baseline-without-metrics scenario: next action is "establish baseline metrics," not "propose experiment."
- **mlspec-run**: Clarify baseline evaluation mode (updates recipe.yaml metrics) vs experiment evidence mode (creates evidence files). Add compute/data budget awareness. Strengthen durable execution guidance toward scripts/configs for nontrivial or repeated work.
- **mlspec-propose**: After baseline creation, emphasize that next step is evaluation, not experiment.
- Generalize LM-specific "generation-collapse metrics" into task-appropriate evaluation checks (generative tasks keep repetition/diversity metrics; classification: per-class/confusion; ranking: NDCG/MRR; detection: mAP/error slices). Core principle: evidence includes task-appropriate sanity/quality checks, not just one scalar.

## Capabilities

### Modified Capabilities

- **mlspec-workflow-skills**: Clarify existing skill template requirements for:
  - Baseline evaluation routing in `mlspec-next`
  - Baseline evaluation mode vs experiment evidence mode distinction in `mlspec-run`
  - Post-baseline guidance in `mlspec-propose`
  - Compute/data budget awareness in `mlspec-run` dataset profiling
  - Durable execution guidance (scripts over inline) in `mlspec-run`
  - Task-appropriate evaluation checks replacing LM-specific generation metrics

## Impact

- Modified files: `src/core/templates/workflows/mlspec-next.ts`, `src/core/templates/workflows/mlspec-run.ts`, `src/core/templates/workflows/mlspec-propose.ts`, `src/mlspec/cli/index.ts` (evidence template text only, no command behavior changes)
- No schema changes
- No new commands or evidence stages
- Backward compatible: existing workspaces work unchanged

## Artifact Lifecycle Clarification

MLSpec workspaces contain three categories of artifacts:

| Category | Location | Examples |
|----------|----------|----------|
| Durable project artifacts | Version-controlled project files | Reusable scripts (`scripts/train.py`), configs, preprocessing scripts, tokenizer definitions |
| Runtime artifacts | `outputs/<run-id>/` (not version-controlled) | Logs, checkpoints, caches |
| MLSpec artifacts | `mlspec/recipes/`, `mlspec/experiments/`, `mlspec/findings/` | Recipe metrics, experiment evidence, findings/resolutions |
