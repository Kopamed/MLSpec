# Implementation Tasks

## 1. Update mlspec-explore Skill Template

### 1.1 Add empty workspace detection
- [x] 1.1.1 Add check for empty `mlspec/recipes/` directory at start of skill
- [x] 1.1.2 Add logic to inspect project structure (training scripts, configs, outputs)
- [x] 1.1.3 Add greenfield detection: no scripts found → recommend minimal starter approach, note no existing implementation found
- [x] 1.1.4 Add brownfield detection: scripts/configs found → identify existing approach, infer baseline ID
- [x] 1.1.5 Ensure skill remains read-only (no file creation, no CLI calls)

### 1.2 Update bootstrap output
- [x] 1.2.1 Output "No recipes found" message when workspace is empty
- [x] 1.2.2 Include recommended baseline approach in output
- [x] 1.2.3 Include suggested recipe ID in output
- [x] 1.2.4 Include "Next: /mlspec-propose <baseline-id>" in output

## 2. Update mlspec-propose Skill Template

### 2.1 Add bootstrap mode detection
- [x] 2.1.1 Add check for empty `mlspec/recipes/` directory
- [x] 2.1.2 Detect if workspace is in bootstrap state vs normal state

### 2.2 Implement bootstrap mode
- [x] 2.2.1 When no recipes: infer or ask for baseline recipe ID
- [x] 2.2.2 Create root recipe with `parent_recipe: null` and `created_by_experiment: null`
- [x] 2.2.3 Tag recipe as `baseline` and `current-best`
- [x] 2.2.4 For greenfield: create skeletal recipe with TODO config fields, metrics as pending
- [x] 2.2.5 For brownfield: attempt best-effort metric discovery from local files (scripts, configs, outputs, logs, notebooks, README)
- [x] 2.2.6 Leave `metrics` empty if not clearly discoverable
- [x] 2.2.7 Do NOT create an experiment in bootstrap mode

### 2.3 Update confirmation behavior
- [x] 2.3.1 Show inferred action before executing
- [x] 2.3.2 Proceed without asking if baseline ID and approach are obvious
- [x] 2.3.3 Ask one focused question only when genuinely ambiguous

### 2.4 Update skill chaining
- [x] 2.4.1 After bootstrap completion, output "Next: /mlspec-run" to establish metrics

## 3. Update mlspec-run Skill Template

### 3.1 Add baseline evaluation mode
- [x] 3.1.1 Add detection for "no experiments but baseline recipe exists" state
- [x] 3.1.2 When baseline has no metrics: suggest running evaluation first
- [x] 3.1.3 Allow updating `recipes/<id>/recipe.yaml` top-level `metrics` field
- [x] 3.1.4 Allow updating `recipes/<id>/summary.md`
- [x] 3.1.5 Do NOT create experiment evidence files in baseline evaluation mode

## 4. Update mlspec-next Skill Template

### 4.1 Handle empty workspace
- [x] 4.1.1 When `mlspec/recipes/` is empty, recommend `/mlspec-explore`
- [x] 4.1.2 Explain that no baseline recipe exists yet

### 4.2 Handle baseline-only state (no experiments)
- [x] 4.2.1 When baseline exists with no metrics, recommend `/mlspec-run`
- [x] 4.2.2 Explain that baseline metrics should be established before proposing experiments
- [x] 4.2.3 When baseline exists with metrics, recommend `/mlspec-explore` or `/mlspec-propose`
- [x] 4.2.4 Explain workspace is ready for first experiment

### 4.3 Handle multiple baseline recipes
- [x] 4.3.1 Infer current-best if unambiguous
- [x] 4.3.2 Ask one focused question if ambiguous

## 5. Spec Verification

### 5.1 Verify bootstrap requirements in change specs
- [x] 5.1.1 Bootstrap requirements are captured in `openspec/changes/mlspec-bootstrap-workflow/specs/`
- [x] 5.1.2 On archive/apply, specs will be synced to `openspec/specs/mlspec-v2-skill-layer/` and new `openspec/specs/mlspec-bootstrap-workflow/`

## 6. Testing

### 6.1 Unit tests for bootstrap detection
- [x] 6.1.1 Test empty workspace detection in mlspec-explore
- [x] 6.1.2 Test bootstrap mode detection in mlspec-propose
- [x] 6.1.3 Test baseline evaluation mode detection in mlspec-run

### 6.2 Integration tests for bootstrap workflow
- [x] 6.2.1 Test greenfield bootstrap: empty workspace → explore → propose → skeletal recipe created
- [x] 6.2.2 Test brownfield bootstrap: workspace with existing ML project → explore → propose → recipe with discovered metrics
- [x] 6.2.3 Test that normal experiment workflow still works after bootstrap

### 6.3 Test skill chaining in bootstrap scenario
- [x] 6.3.1 Verify /mlspec-explore in empty workspace outputs "Next: /mlspec-propose"
- [x] 6.3.2 Verify /mlspec-propose bootstrap outputs "Next: /mlspec-run"
- [x] 6.3.3 Verify /mlspec-run suggests evaluation when baseline has no metrics

### 6.4 Test confirmation behavior
- [x] 6.4.1 Verify skill proceeds without asking when baseline is obvious
- [x] 6.4.2 Verify skill asks one question when genuinely ambiguous
