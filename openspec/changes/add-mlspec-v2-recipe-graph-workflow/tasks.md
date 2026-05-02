# Implementation Tasks

## 1. Schema and Entity Types

### 1.1 Create MLSpec V2 Schema

- [x] 1.1.1 Create `schemas/ml-experiment-v2/schema.yaml` with new schema definition
- [x] 1.1.2 Define recipe entity with: id, name, tags, parent_recipe, created_by_experiment, config
- [x] 1.1.3 Define experiment entity with: base_recipe, proposed_recipe, proposed_change, controlled_variables, success_criteria, abort_criteria, evidence_plan
- [x] 1.1.4 Define evidence entity with: stage (smoke|validation|final), runs[], aggregate{}
- [x] 1.1.5 Define resolution entity with: resolution (accept|reject|retry|hold|inconclusive), accepted_recipe, accepted_tags
- [x] 1.1.6 Define finding entity (existing pattern)
- [x] 1.1.7 Update evaluation entity for V2

### 1.2 Update Entity Types

- [x] 1.2.1 Update `src/mlspec/entity-types.ts` with new schemas
- [x] 1.2.2 Add RecipeMetadataSchema with tags enum
- [x] 1.2.3 Update ExperimentMetadataSchema with base_recipe, proposed_recipe, proposed_change
- [x] 1.2.4 Update EvidenceFrontmatterSchema with stage and runs aggregation
- [x] 1.2.5 Add ResolutionFrontmatterSchema
- [x] 1.2.6 Add RecipeTagSchema enum (baseline, candidate, current-best, variant, archived)
- [x] 1.2.7 Add EvidenceStageSchema enum (smoke, validation, final)
- [x] 1.2.8 Add ResolutionTypeSchema enum (accept, reject, retry, hold, inconclusive)
- [x] 1.2.9 Update getEntityDir() to use recipes/ instead of baselines/candidates/

### 1.3 Create V2 Templates

- [x] 1.3.1 Create `schemas/ml-experiment-v2/templates/recipe.yaml` template
- [x] 1.3.2 Create `schemas/ml-experiment-v2/templates/experiment.yaml` template
- [x] 1.3.3 Create `schemas/ml-experiment-v2/templates/hypothesis.md` template (updated fields)
- [x] 1.3.4 Create `schemas/ml-experiment-v2/templates/evidence/smoke.md` template
- [x] 1.3.5 Create `schemas/ml-experiment-v2/templates/evidence/validation.md` template
- [x] 1.3.6 Create `schemas/ml-experiment-v2/templates/evidence/final.md` template
- [x] 1.3.7 Create `schemas/ml-experiment-v2/templates/resolution.md` template
- [x] 1.3.8 Create `schemas/ml-experiment-v2/templates/finding.md` template
- [x] 1.3.9 Create `schemas/ml-experiment-v2/templates/evaluation.md` template

## 2. CLI Commands

### 2.1 Recipe Commands

- [x] 2.1.1 Update `mlspec new recipe <id>` command to create recipes/<id>/ structure
- [x] 2.1.2 Add `mlspec tag recipe <id> <tag>` command
- [x] 2.1.3 Add `mlspec untag recipe <id> <tag>` command
- [x] 2.1.4 Add `mlspec list recipes [--tag]` command
- [x] 2.1.5 Add `mlspec show recipe <id>` command
- [x] 2.1.6 Add `mlspec diff <recipe-a> <recipe-b>` command
- [x] 2.1.7 Remove `mlspec new baseline` command (BREAKING)
- [x] 2.1.8 Remove `mlspec new candidate` command (BREAKING)

### 2.2 Experiment Commands

- [x] 2.2.1 Update `mlspec new experiment <id>` to require --from and --proposes flags
- [x] 2.2.2 Add `mlspec set-status <experiment> <status>` command
- [x] 2.2.3 Update experiment.yaml to store base_recipe and proposed_recipe
- [x] 2.2.4 Remove comparison_ref field (BREAKING)
- [x] 2.2.5 Update `mlspec list experiments` to show status
- [x] 2.2.6 Add `mlspec list experiments [--status]` command

### 2.3 Evidence Commands

- [x] 2.3.1 Update `mlspec add-evidence <experiment> --stage <stage>` command
- [x] 2.3.2 Replace --level E1/E2/E3 with --stage smoke/validation/final (BREAKING)
- [x] 2.3.3 Add runs aggregation to evidence files
- [x] 2.3.4 Add `mlspec show evidence <experiment>` command
- [x] 2.3.5 Update evidence file naming to <stage>.md format

### 2.4 Resolution Commands

- [x] 2.4.1 Add `mlspec accept <experiment> --as <recipe> --tag <tag>` command
- [x] 2.4.2 Add `mlspec reject <experiment> --reason` command
- [x] 2.4.3 Add `mlspec retry <experiment> --plan` command
- [x] 2.4.4 Add `mlspec hold <experiment> --reason` command
- [x] 2.4.5 Add `mlspec inconclusive <experiment> --reason` command
- [x] 2.4.6 Remove `mlspec promote` command (BREAKING)
- [x] 2.4.7 Remove `mlspec decide` command (BREAKING)
- [x] 2.4.8 Accept creates new recipe node at recipes/<id>/
- [x] 2.4.9 Implement acceptance warning matrix
- [x] 2.4.10 Prevent re-resolving already resolved experiments (accept/reject/retry/hold/inconclusive)

### 2.5 Graph and Navigation Commands

- [x] 2.5.1 Add `mlspec graph` command for text visualization
- [x] 2.5.2 Add `mlspec lineage <recipe-id>` command
- [x] 2.5.3 Add `mlspec next` command as read-only router
- [x] 2.5.4 Implement recipe graph traversal from parent_recipe links
- [x] 2.5.5 Implement cycle detection in parent chain
- [x] 2.5.6 Fix `mlspec next` priority order (check abort criteria first)

### 2.6 Validation

- [x] 2.6.1 Add validation for recipe parent exists
- [x] 2.6.2 Add validation for experiment base_recipe exists
- [x] 2.6.3 Add validation for cycle detection
- [x] 2.6.4 Add warning for multiple current-best tags
- [x] 2.6.5 Add warning for accepting from smoke as current-best
- [x] 2.6.6 Add informational note when accepting as current-best with final evidence
- [x] 2.6.7 Update `mlspec validate` for V2 structure
- [x] 2.6.8 Fix `validate --strict` to exit with code 1 on warnings

## 3. Skill Layer

### 3.1 Remove Old Skills

- [x] 3.1.1 Remove `.opencode/commands/mlspec-propose-experiment.md` (already removed - not present)
- [x] 3.1.2 Remove `.opencode/commands/mlspec-run-evidence.md` (already removed - not present)
- [x] 3.1.3 Remove `.opencode/commands/mlspec-decide.md` (already removed - not present)
- [x] 3.1.4 Remove `.opencode/commands/mlspec-promote.md` (already removed - not present)
- [x] 3.1.5 Remove `.opencode/commands/mlspec-archive.md` (already removed - not present)
- [x] 3.1.6 Update `src/mlspec/cli/mlspec-workflows.ts` to use V2 workflow IDs

### 3.2 Create New Skills

- [x] 3.2.1 Create `.opencode/skills/mlspec-explore/SKILL.md`
- [x] 3.2.2 Create `.opencode/skills/mlspec-propose/SKILL.md`
- [x] 3.2.3 Create `.opencode/skills/mlspec-run/SKILL.md`
- [x] 3.2.4 Create `.opencode/skills/mlspec-resolve/SKILL.md`
- [x] 3.2.5 Create `.opencode/skills/mlspec-next/SKILL.md`

### 3.3 Skill Inference Logic (Workspace-Based)

Skills infer from workspace files, not conversation inference in TypeScript.

- [x] 3.3.1 Skills read workspace files (recipes, experiments, evidence, tags) for inference
- [x] 3.3.2 Skills read experiment status and evidence state for stage inference
- [x] 3.3.3 Skills read evidence recommendations for resolution inference
- [x] 3.3.4 Skills instruct agent to ask one question when ambiguous
- [x] 3.3.5 Skills instruct agent to show inferred action before executing

## 4. Documentation Updates

### 4.1 Update Documentation

- [x] 4.1.1 Update `mlspec/AGENTS.md` for V2 workflow
- [x] 4.1.2 Update `mlspec/evaluation.md` template
- [x] 4.1.3 Update README.md MLSpec commands section
- [x] 4.1.4 Remove V1 command files from `.opencode/commands/` (V1 mlspec-* files not present - only opsx-* remain)

## 5. Testing

### 5.1 Unit Tests

- [x] 5.1.1 Add tests for RecipeMetadataSchema validation (v2-schemas.test.ts)
- [x] 5.1.2 Add tests for ExperimentMetadataSchema with base_recipe/proposed_recipe (v2-schemas.test.ts)
- [x] 5.1.3 Add tests for EvidenceFrontmatterSchema with runs aggregation (v2-schemas.test.ts)
- [x] 5.1.4 Add tests for ResolutionFrontmatterSchema (v2-schemas.test.ts)
- [x] 5.1.5 Add tests for recipe tag operations (v2-schemas.test.ts)
- [x] 5.1.6 Add tests for parent chain traversal (v2-integration.test.ts)
- [x] 5.1.7 Add tests for cycle detection (v2-integration.test.ts)

### 5.2 Integration Tests

- [x] 5.2.1 Add test: `mlspec new recipe` creates recipes/ structure (v2-integration.test.ts)
- [x] 5.2.2 Add test: `mlspec new experiment --from X --proposes Y` creates experiment (v2-integration.test.ts)
- [x] 5.2.3 Add test: `mlspec add-evidence --stage smoke` creates evidence file (v2-integration.test.ts)
- [x] 5.2.4 Add test: `mlspec accept` creates recipe node (v2-integration.test.ts)
- [x] 5.2.5 Add test: `mlspec graph` shows recipe-experiment graph (v2-integration.test.ts)
- [x] 5.2.6 Add test: `mlspec next` outputs recommendation (v2-integration.test.ts)
- [x] 5.2.7 Add test: acceptance warning matrix triggers correctly (v2-integration.test.ts)

### 5.3 Cross-Platform Tests

- [x] 5.3.1 Windows CI verification task exists in `.github/workflows/ci.yml`
- [x] 5.3.2 Windows path handling tests exist in `test/utils/file-system.test.ts`

## 6. Cleanup

### 6.1 Remove Deprecated Code

- [x] 6.1.1 Remove baselines/ directory handling
- [x] 6.1.2 Remove candidates/ directory handling
- [x] 6.1.3 Remove E1/E2/E3/E4/E5 evidence level handling
- [x] 6.1.4 Remove decision.md handling (use resolution.md)
- [x] 6.1.5 Remove promote command handling
- [x] 6.1.6 Remove auto-archive logic

### 6.2 Remove V1 Code

- [x] 6.2.1 Remove `schemas/ml-experiment/` directory (already removed - not present)
- [x] 6.2.2 Remove V1 code paths from entity-types.ts
- [x] 6.2.3 Remove V1 command handlers from CLI
- [x] 6.2.4 Existing V1 workspaces are not supported - no migration needed

### 6.3 Additional Cleanup

- [x] 6.3.1 Remove V1 cli.ts file (1203 lines of legacy code)
- [x] 6.3.2 Remove V1 skill template files (mlspec-propose-experiment, mlspec-run-evidence, etc.)
- [x] 6.3.3 Update V1 references in tool-detection.ts, profiles.ts, profile-sync-drift.ts
