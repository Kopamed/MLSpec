## Why

Dogfooding MLSpec 2.1.1 on a greenfield TinyStories project exposed that the skills assume model code, data pipeline, hardware setup, training scripts, caching, and evaluation already exist. This caused agents to:
- Write long inline Python training commands instead of reusable scripts
- Ignore/underuse accelerator hardware (CUDA/ROCm/MPS)
- Preprocess data repeatedly without deterministic caching
- Use bad logging like `2>&1 | tail -30`
- Run full training while debugging
- Manually write invalid evidence files
- Blur boundaries between propose/run/explore
- Train models with potential target-leakage (autoregressive label shift)

## What Changes

- **Skill template updates**: Add run-readiness discipline to `mlspec-run` skill template
- **Dataset profiling requirements**: Define what profiling checks the `mlspec-run` skill must perform before recording evidence
- **Target-leakage sanity check**: Require evidence that autoregressive training is correctly shifted (no next-token prediction on current token)
- **Generation-collapse metrics**: Replace BLEU/ROUGE with repetition_rate, distinct-n, max-token-run metrics for sanity checks
- **`mlspec next --json` duplicate fix**: Don't recommend adding evidence for stages that already exist at `mlspec/experiments/<id>/evidence/{smoke,validation,final}.md`
- **Evidence body sections**: Run-readiness info in Markdown body sections, not frontmatter
- **Live logging guidance**: Training output should use `tee` for live viewing, not tail-only patterns

## Capabilities

### New Capabilities

- `mlspec-run-readiness`: Requirements for `mlspec-run` skill to enforce dataset profiling, accelerator preflight, and training ladder checklist before recording evidence
- `mlspec-target-leakage-check`: Sanity check that autoregressive labels are shifted correctly (model cannot attend to answer token)
- `mlspec-generation-collapse-metrics`: Generation quality metrics that detect collapse (repetition_rate, distinct-1/2, max-token-run, punctuation-only ratio, special-token ratio, top-token frequency)
- `mlspec-next-no-dupe-stage`: Fix `mlspec next --json` to not recommend duplicate evidence stages

### Modified Capabilities

- `mlspec-workflow-skills`: Update `mlspec-run` skill template with run-readiness requirements, dataset profiling, target-leakage checks, generation metrics, and live logging guidance

## Impact

- `mlspec-run` skill template at `src/core/templates/workflows/mlspec-run.ts`
- `mlspec-next` skill template at `src/core/templates/workflows/mlspec-next.ts`
- Generated skills at `.opencode/skills/mlspec-*/SKILL.md`
- Evidence templates and schema validation