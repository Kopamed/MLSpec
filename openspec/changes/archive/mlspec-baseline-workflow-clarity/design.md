## Context

MLSpec v2 provides workflow skill templates (`mlspec-next`, `mlspec-run`, `mlspec-propose`, etc.) that guide agents through ML experimentation. The templates include baseline evaluation mode and experiment evidence mode, but the distinction is not prominent enough in the instructions. This caused confusion in greenfield dogfood testing.

Current state:
- `mlspec-next` has bootstrap routing but does not explicitly route "baseline exists, no metrics" to evaluation work
- `mlspec-run` has baseline evaluation mode (updates recipe metrics) vs experiment mode (creates evidence) but the distinction is buried
- `mlspec-run` includes LM-specific "generation-collapse metrics" that do not apply to classification, ranking, or other ML tasks
- Durable execution guidance exists but is not prominent enough to prevent inline snippets

## Goals / Non-Goals

**Goals:**
- Make baseline evaluation routing in `mlspec-next` explicit and prominent
- Clarify in `mlspec-run` that baseline evaluation updates recipe.yaml metrics (not evidence files)
- Add compute/data budget awareness in dataset profiling (general ML terms, not LM-specific)
- Strengthen durable execution guidance toward scripts/configs for nontrivial or repeated work
- Generalize LM-specific generation-collapse metrics into task-appropriate evaluation checks (generative tasks retain repetition/diversity metrics; other task types use their own appropriate checks)

**Non-Goals:**
- No new schema definitions
- No new evidence stages
- No new commands
- No changes to CLI command behavior
- No domain-specific scaling laws or formulas (Chinchilla, token-per-parameter, etc.)
- Note: Template text in `src/mlspec/cli/index.ts` (evidence template) may be updated as part of instruction changes, but command-line argument parsing and behavior remain unchanged

## Decisions

### 1. Instruction-only changes, no schema changes

All changes are clarifications to the `instructions` strings in the skill template functions. No Zod schemas, entity types, or CLI commands are modified.

**Rationale**: Keeps risk minimal. Existing workspaces remain valid. The change only affects agent guidance.

### 2. Baseline routing clarity via instruction prominence

In `mlspec-next.ts`, the "Baseline Exists But No Experiments" bootstrap routing section (currently 2a/2b) will be made more explicit:

- When baseline has no metrics: route to `/mlspec-run` in baseline evaluation mode, explicitly NOT experiment evidence
- When baseline has metrics: route to `/mlspec-propose` for first experiment

**Rationale**: The routing logic already exists in the template but was not preventing the dogfood confusion. Making it more explicit and action-oriented should help.

### 3. Task-appropriate evaluation checks generalizing generation-collapse metrics

The "Generation-Collapse Metrics" section in `mlspec-run.ts` evidence template will be broadened to "Task-Appropriate Evaluation Checks":

- For generative tasks: repetition rate, diversity metrics (distinct N), max token run (these remain as-is)
- For classification: per-class metrics, confusion matrix summary, class-balanced accuracy
- For ranking: NDCG, MRR, precision@K
- For detection: mAP, error analysis by category

**Rationale**: The principle is "evidence must include task-appropriate sanity/quality checks, not just one scalar metric." Generative metrics are preserved for generative tasks but framed as one option among many task types.

### 4. Compute/data budget awareness as checklist items

Add explicit checklist items to the dataset profiling section in `mlspec-run.ts`:

- Estimated data units (rows, sequences, etc.)
- Effective batch size and gradient accumulation
- Planned training units (steps, epochs, etc.)
- Estimated runtime
- "Is this scale appropriate for the model/task?" prompt

**Rationale**: Prevents the dogfood issue of thinking in full epochs first without considering whether the scale is appropriate.

### 5. Durable execution guidance as explicit nudge

Add a "Durable Execution" section in `mlspec-run.ts` that nudges toward:
- Scripts (`scripts/train.py`, `scripts/evaluate.py`) over inline Python
- Config files over hardcoded values
- Reusable preprocessing scripts
- The principle: if the command is nontrivial or will be repeated, make it a script

**Rationale**: The guidance exists elsewhere but was not preventing inline snippets in dogfood. Explicit nudge helps.

### 6. Artifact lifecycle clarification

Explicitly document the three artifact categories in `mlspec-run.ts` instructions:

- **Durable project artifacts**: Version-controlled reusable scripts, configs, preprocessing scripts, tokenizer definitions where applicable. Stored outside `mlspec/` directory.
- **Runtime artifacts**: `outputs/<run-id>/logs`, `outputs/<run-id>/cache`, `outputs/<run-id>/checkpoints`. Not version-controlled.
- **MLSpec artifacts**: `mlspec/recipes/` (metrics), `mlspec/experiments/<id>/evidence/` (evidence), `mlspec/findings/` (findings/resolutions). Version-controlled.

**Rationale**: Clarifies that reusable artifacts belong in version-controlled project files, not in runtime-only `outputs/` directory.

## Risks / Trade-offs

[Risk] Agents may still ignore guidance even with clarifications
→ [Mitigation] This is an instruction-only change; enforcement ultimately depends on agent behavior. The change improves prominence, not new enforcement mechanisms.

[Risk] Task-appropriate evaluation checks may be too vague for agents to act on
→ [Mitigation] Provide concrete examples for each ML task type (generative, classification, ranking, detection) so agents have clear patterns to follow.

[Risk] Adding more checklist items makes evidence templates longer
→ [Mitigation] Keep additions minimal and integrate into existing sections where possible. The dataset profiling section already exists; we're adding budget awareness to it.
