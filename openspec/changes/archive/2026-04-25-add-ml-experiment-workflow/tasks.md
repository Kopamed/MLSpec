## 1. Schema and Templates

- [x] 1.1 Create `schemas/ml-experiment/schema.yaml` defining artifacts: evaluation, hypothesis, evidence, decision, baseline, recipe, findings
- [x] 1.2 Create template `schemas/ml-experiment/templates/evaluation.md` with evaluation spec structure
- [x] 1.3 Create template `schemas/ml-experiment/templates/hypothesis.md` with hypothesis structure
- [x] 1.4 Create template `schemas/ml-experiment/templates/evidence.md` with evidence structure and frontmatter
- [x] 1.5 Create template `schemas/ml-experiment/templates/decision.md` with decision structure
- [x] 1.6 Create template `schemas/ml-experiment/templates/baseline.md` with baseline structure
- [x] 1.7 Create template `schemas/ml-experiment/templates/recipe.md` with recipe structure
- [x] 1.8 Create template `schemas/ml-experiment/templates/finding.md` with finding structure

## 2. Core Infrastructure Refactoring

- [ ] 2.1 Update `src/core/artifact-graph/resolver.ts` to accept workspace path parameter (openspec vs mlspec)
- [ ] 2.2 Update `src/core/project-config.ts` to support mlspec workspace config discovery
- [ ] 2.3 Extract generic entity metadata utilities from change-metadata.ts

## 3. MLSpec Entity System

- [x] 3.1 Create `src/mlspec/entity-types.ts` defining ExperimentMetadata, BaselineMetadata, CandidateMetadata, FindingMetadata
- [x] 3.2 Create `src/mlspec/reference-resolver.ts` for cross-entity reference validation
- [x] 3.3 Implement evidence frontmatter parsing and validation

## 4. MLSpec CLI Commands

- [x] 4.1 Create `src/mlspec/cli.ts` registering `openspec ml` subcommand
- [x] 4.2 Implement `openspec ml init` — creates mlspec/ workspace structure
- [x] 4.3 Implement `openspec ml new baseline <name>` — creates baseline entity
- [x] 4.4 Implement `openspec ml new candidate <name>` — creates candidate entity
- [x] 4.5 Implement `openspec ml new experiment <name>` — creates experiment entity with hypothesis.md
- [x] 4.6 Implement `openspec ml add evidence <experiment> --level E1|E2|E3|E4|E5` — creates evidence file
- [x] 4.7 Implement `openspec ml decide <experiment>` — creates/updates decision.md
- [x] 4.8 Implement `openspec ml promote <experiment> --to <candidate>` — creates new candidate version
- [x] 4.9 Implement `openspec ml archive <experiment>` — moves experiment to archive subdirectory
- [x] 4.10 Implement `openspec ml status` — shows multi-entity status display
- [x] 4.11 Implement `openspec ml validate` — validates structure and flags suspicious patterns

## 5. Archive Mechanics

- [x] 5.1 Create archive movement utilities reusable for MLSpec (not OpenSpec's delta-spec merge)
- [x] 5.2 Support archive subdirectories: promoted/, rejected/, inconclusive/, held/, retry/
- [x] 5.3 Preserve experiment directory in archive (not merged into canonical state)

## 6. Validation Engine

- [x] 6.1 Implement structural validation (errors): malformed YAML, missing frontmatter, broken refs
- [x] 6.2 Implement suspicious pattern detection (warnings): E2<E1, thin evidence for promote, skipped levels
- [x] 6.3 Implement evidence level consistency checking
- [x] 6.4 Implement reference validation (baseline_ref, candidate_ref, experiment_ref)

## 7. MLSpec Self-Hosting (Optional)

- [ ] 7.1 Create example `mlspec/` workspace in this repo demonstrating the workflow
- [ ] 7.2 Document the example workspace for onboarding

## 8. Testing

- [ ] 8.1 Add unit tests for evidence frontmatter parsing
- [ ] 8.2 Add unit tests for ReferenceResolver
- [x] 8.3 Add integration tests for MLSpec command lifecycle
- [ ] 8.4 Add cross-platform path tests (Windows compatibility)

## 9. Documentation

- [ ] 9.1 Update CLI help text for `openspec ml` subcommands
- [ ] 9.2 Add documentation for MLSpec workflow and evidence levels
- [ ] 9.3 Add migration guide for teams adopting MLSpec from other tools

## 10. Release

- [ ] 10.1 Add changeset describing the feature
- [ ] 10.2 Verify existing OpenSpec tests still pass
- [ ] 10.3 Update README if applicable
