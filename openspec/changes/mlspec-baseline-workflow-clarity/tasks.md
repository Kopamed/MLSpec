## 1. Update mlspec-next.ts

- [x] 1.1 Clarify "Baseline Exists But No Experiments" routing section to explicitly route to baseline evaluation (not experiment evidence) when baseline has no metrics, even if experiments already exist
- [x] 1.2 Add explicit distinction between evaluation work (establishes baseline metrics) and experiment work (tests hypotheses)
- [x] 1.3 Verify routing for "baseline has metrics" case points to `/mlspec-propose`

## 2. Update mlspec-run.ts

- [x] 2.1 Rename/reorganize "Baseline Evaluation Mode" section header to make it more prominent
- [x] 2.2 Add explicit statement: "Baseline establishment is evaluation work, not experiment evidence work"
- [x] 2.3 Add compute/data budget awareness checklist items to dataset profiling section (data units, batch size, planned training units, runtime estimate, appropriateness checkpoint)
- [x] 2.4 Add durable execution guidance section with nudge toward scripts/configs for nontrivial or repeated commands
- [x] 2.5 Generalize "Generation-Collapse Metrics" section into "Task-Appropriate Evaluation Checks" providing guidance for generative, classification, ranking, and detection tasks (generative metrics remain for generative tasks)
- [x] 2.6 Update evidence template text in CLI (src/mlspec/cli/index.ts add-evidence command) to reflect task-appropriate checks (template text only, no command behavior changes)
- [x] 2.7 Add artifact lifecycle clarification: durable project artifacts (scripts/configs), runtime artifacts (outputs/<run-id>/logs, caches, checkpoints), MLSpec artifacts (mlspec/recipes/, mlspec/experiments/, mlspec/findings/)

## 3. Update mlspec-propose.ts

- [x] 3.1 Add explicit post-baseline-creation guidance in bootstrap mode output: next step is `/mlspec-run` for baseline evaluation, not experiment creation
- [x] 3.2 Add statement: "Baseline establishment is evaluation work that updates recipe.yaml metrics"

## 4. Verification

- [x] 4.1 Run existing tests to verify no regressions (1 pre-existing failure: generatedBy regex doesn't match 2.1.2-dev.0 format)
- [x] 4.2 Verify build succeeds
- [x] 4.3 Manual review of updated instruction strings to confirm clarity and prominence of key distinctions
