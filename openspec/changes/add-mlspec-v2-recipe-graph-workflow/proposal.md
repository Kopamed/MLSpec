## Why

The current MLSpec model conflates workflow states with entity types. The baseline/candidate/promote/decide vocabulary creates confusion because:
- "candidate" implies being considered, not necessarily production-ready
- "promote" vs "decide" redundancy
- Linear version numbers on candidates don't capture branching ML workflows
- E1/E2/E3/E4/E5 evidence levels add ceremony without grounding in real ML practice
- The skill layer reflects old model and doesn't support conversational inference

Real ML engineering uses: baselines, controlled experiments, evidence from runs, recipe lineage with branching, and acceptance/rejection based on evidence—not promotion tracks.

## What Changes

### Breaking Changes to Core Model
- **BREAKING**: Remove `baselines/` and `candidates/` directories. Use only `recipes/`
- **BREAKING**: Recipe IDs are globally unique and semantic (e.g., `rf-mfcc-v1`), not ancestry-encoded
- **BREAKING**: Each accepted experiment creates a new recipe node, not a new version
- **BREAKING**: Replace `comparison_ref` with `base_recipe` (explicit reference with version)
- **BREAKING**: Replace `decision.md` with `resolution.md`
- **BREAKING**: Replace `promote` command with `accept` (direct resolution verb)
- **BREAKING**: Replace evidence levels E1/E2/E3/E4/E5 with semantic stages: `smoke`, `validation`, `final`
- **BREAKING**: Remove auto-archive. Resolved experiments stay in `experiments/`

### New CLI Commands
- `mlspec new recipe <id>` - Create baseline recipe
- `mlspec tag recipe <id> <tag>` - Add tag (baseline, candidate, current-best, variant, archived)
- `mlspec set-status <experiment> <status>` - Set draft/running/resolved
- `mlspec accept <experiment> --as <recipe> --tag <tag>` - Accept experiment, creates recipe
- `mlspec reject|retry|hold|inconclusive <experiment> --reason/--plan` - Resolution verbs
- `mlspec graph` - Text visualization of recipe-experiment graph
- `mlspec lineage <recipe-id>` - Show recipe ancestry
- `mlspec diff <recipe-a> <recipe-b>` - Compare two recipes
- `mlspec next` - Read-only router recommending next action

### Breaking Changes to Skill Layer
- **BREAKING**: Remove old skills: `mlspec-propose-experiment`, `mlspec-run-evidence`, `mlspec-decide`, `mlspec-promote`, `mlspec-archive`
- **BREAKING**: Add new skills: `mlspec-explore`, `mlspec-propose`, `mlspec-run`, `mlspec-resolve`, `mlspec-next`
- Skills infer missing inputs from conversation context, workspace state, and user's last intent
- Skills ask one focused question only when genuinely ambiguous
- Skills show inferred action before executing

### Schema Changes
- Create `schemas/ml-experiment-v2/schema.yaml` (new schema)
- Remove or replace `schemas/ml-experiment/schema.yaml` (v1)
- Recipe entity: `id`, `name`, `tags[]`, `parent_recipe`, `created_by_experiment`, `config`
- Experiment entity: `base_recipe`, `proposed_recipe`, `proposed_change`, `controlled_variables`, `success_criteria`, `abort_criteria`, `evidence_plan`
- Evidence: `stage` (smoke|validation|final), `runs[]`, `aggregate{}`
- Resolution: `resolution` (accept|reject|retry|hold|inconclusive), `accepted_recipe`, `accepted_tags`

## Capabilities

### New Capabilities
- `mlspec-v2-recipe-model`: Recipe graph with parent links, semantic IDs, and tags
- `mlspec-v2-experiment-model`: Experiment as recipe-delta hypothesis with base_proposed structure
- `mlspec-v2-evidence-stages`: Semantic evidence stages (smoke/validation/final) with run aggregation
- `mlspec-v2-resolution-workflow`: Direct resolution verbs and accept-creates-recipe behavior
- `mlspec-v2-skill-layer`: Five conversational skills with context inference
- `mlspec-v2-graph-commands`: Lightweight graph/lineage/diff/next commands

### Modified Capabilities
- `mlspec-workflow-skills`: Replace 6 old skills with 5 new skills. New skills infer context, old skills required explicit arguments.

## Impact

### Code Changes
- `src/mlspec/entity-types.ts` - New entity schemas
- `src/mlspec/cli/*.ts` - New CLI commands
- `src/mlspec/protocol.ts` - Protocol updates
- `schemas/ml-experiment-v2/schema.yaml` - New schema
- `schemas/ml-experiment/schema.yaml` - Remove/replace V1
- `.opencode/skills/mlspec-*/SKILL.md` - Replace old skills
- MLSpec skills installed via `mlspec init --tools <tool>`, not `openspec init --tools <tool>`

### Template Changes
- `schemas/ml-experiment-v2/templates/recipe.yaml` - New recipe format
- `schemas/ml-experiment-v2/templates/experiment.yaml` - New experiment format
- `schemas/ml-experiment-v2/templates/evidence/` - smoke.md, validation.md, final.md
- `schemas/ml-experiment-v2/templates/resolution.md` - Replace decision.md
- `schemas/ml-experiment-v2/templates/hypothesis.md` - Updated fields

### Directory Structure Changes
- `mlspec/recipes/` replaces `mlspec/baselines/` and `mlspec/candidates/`
- `mlspec/experiments/*/evidence/smoke.md` replaces E1.md
- `mlspec/experiments/*/resolution.md` replaces decision.md

### No Backwards Compatibility
This is an early-phase breaking redesign. No migration path, no deprecation support. Existing MLSpec workspaces must be recreated or manually migrated.
