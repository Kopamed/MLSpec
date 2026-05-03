# mlspec-workflow-skills Specification (Delta)

## MODIFIED Requirements

### Requirement: MLSpec Skill Templates Match Existing Content

The system SHALL use content equivalent to the manually-created MLSpec skill files.

#### Scenario: mlspec-next skill content - baseline routing
- **WHEN** `getMlspecNextSkillTemplate()` is called
- **THEN** the returned template SHALL include:
  - Explicit routing for "baseline exists, no metrics" scenario pointing to baseline evaluation via `/mlspec-run` in baseline evaluation mode
  - Baseline evaluation takes priority even if experiments exist: without baseline metrics, comparisons are weak or impossible
  - Explicit routing for "baseline exists, has metrics" scenario pointing to `/mlspec-propose` for first experiment
  - The distinction between evaluation work (establishes baseline metrics) and experiment work (tests hypotheses)

#### Scenario: mlspec-run skill content - baseline evaluation mode vs experiment mode
- **WHEN** `getMlspecRunSkillTemplate()` is called
- **THEN** the returned template SHALL include:
  - Baseline evaluation mode: Updates `mlspec/recipes/<id>/recipe.yaml` top-level `metrics` field, does NOT create experiment evidence files
  - Experiment evidence mode: Creates `mlspec/experiments/<id>/evidence/<stage>.md` files
  - Clear distinction between the two modes, prominent in the instructions
  - The principle: "Baseline establishment is evaluation work, not experiment evidence work"

#### Scenario: mlspec-run skill content - compute/data budget awareness
- **WHEN** `getMlspecRunSkillTemplate()` is called
- **THEN** the returned template SHALL include dataset profiling guidance that prompts for:
  - Estimated data units (rows, sequences, tokens, etc.)
  - Effective batch size and gradient accumulation strategy
  - Planned training units (steps, epochs, etc.)
  - Estimated runtime
  - "Is this scale appropriate for the model and task?" checkpoint before full runs

#### Scenario: mlspec-run skill content - durable execution
- **WHEN** `getMlspecRunSkillTemplate()` is called
- **THEN** the returned template SHALL include durable execution guidance that:
  - Nudges toward scripts (`scripts/train.py`, `scripts/evaluate.py`) for nontrivial or repeated commands
  - Nudges toward config files over hardcoded values
  - Explains the principle: "If the command is nontrivial or will be repeated, make it a script"
  - Marks inline snippets as acceptable only for quick exploration, not durable work

#### Scenario: mlspec-run skill content - task-appropriate evaluation checks
- **WHEN** `getMlspecRunSkillTemplate()` is called
- **THEN** the returned template SHALL include evidence guidance for task-appropriate evaluation checks:
  - For generative tasks: repetition metrics, diversity metrics (distinct N), max token run (these remain as the appropriate checks for generative work)
  - For classification: per-class metrics, confusion matrix summary, class-balanced accuracy
  - For ranking: NDCG, MRR, precision@K
  - For detection: mAP, error analysis by category
  - The principle: "Evidence must include task-appropriate sanity/quality checks, not just one scalar metric"

#### Scenario: mlspec-propose skill content - post-baseline guidance
- **WHEN** `getMlspecProposeSkillTemplate()` is called
- **THEN** the returned template SHALL include bootstrap mode guidance that:
  - After baseline recipe creation, directs toward `/mlspec-run` for baseline evaluation (not experiment creation)
  - Explicitly states: "Baseline establishment is evaluation work that updates recipe.yaml metrics"
  - Does not suggest proposing experiments until baseline metrics are established
