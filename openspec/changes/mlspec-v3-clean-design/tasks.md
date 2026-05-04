# Tasks: MLSpec V3 Clean Design

## 1. Schema Foundation

- [x] 1.1 Add ProtocolMetadataSchema to entity-types.ts (compute_agreement, evidence_ladder, baseline_requirements)
- [x] 1.2 Add PrepareMetadataSchema to entity-types.ts (status, checks, blocking_issues, protocol_issues, baseline_availability)
- [x] 1.3 Add RungEvidenceSchema to entity-types.ts (replaces EvidenceFrontmatterSchema - rung-based, arms, comparison)
- [x] 1.4 Add MechanisticOutcome and PracticalOutcome types for ResolutionSchema
- [x] 1.5 Update ResolutionFrontmatterSchema with mechanistic_outcome, practical_outcome, remove supporting_evidence[].stage
- [x] 1.6 Remove EvidenceStageSchema from entity-types.ts (completely removed)
- [x] 1.7 Remove evidence_plan field from ExperimentMetadataSchema
- [x] 1.8 Add entity type helpers for protocol and prepare (registry updates, V3-aware names)

## 2. Reference Resolver Updates

- [x] 2.1 Add loadProtocolMetadata(projectPath, experiment) function
- [x] 2.2 Add loadPrepareMetadata(projectPath, experiment) function
- [x] 2.3 Add protocolExists(projectPath, experiment) function
- [x] 2.4 Add prepareExists(projectPath, experiment) function
- [x] 2.5 Add getEvidenceLadder(projectPath, experiment) function
- [x] 2.6 Add getRungEvidencePath(projectPath, experiment, rung) function
- [x] 2.7 Update protocol state resolver to consider prepare_status (getProtocolStateV3)

## 3. CLI Command Removal (BREAKING)

- [x] 3.1 Remove add-evidence command from cli/index.ts (body removed - V3 uses agent writing evidence/<rung>.md)
- [x] 3.7 Remove EvidenceStageSchema imports from cli/index.ts (EvidenceStageSchema and ResolutionFrontmatterSchemaV2 completely removed)
- [x] 3.2-3.6 Remove accept/reject/retry/hold/inconclusive commands (V3 uses resolve command)

## 4. CLI Status Command Update

- [x] 4.1 Update experiment status output to include prepare_status field
- [x] 4.2 Update experiment status output to include evidence_ladder_status (rung-based, not stage-based)
- [x] 4.3 Update general status output to reflect V3 workspace structure
- [x] 4.4 Add prepare_status to --json output structure

## 5. CLI Validate Command Update

- [x] 5.1 Update validate to require protocol.md (error if missing)
- [x] 5.2 Update validate to require evidence_ladder non-empty
- [x] 5.3 Update validate to require compute_agreement
- [x] 5.4 Update validate to require prepare.md before evidence exists
- [x] 5.5 Update validate to error on evidence for rung not in protocol
- [x] 5.6 Remove EvidenceStageSchema iteration from validate
- [x] 5.7 Update workspace_version check for v3

## 6. CLI mlspec prepare Command (validates prepare.md artifact)

- [x] 6.1 Create src/mlspec/cli/mlspec-prepare.ts with PrepareCommand class
- [x] 6.2 Command validates prepare.md exists and schema-valid
- [x] 6.3 Command returns exit code based on prepare.md status: 0 ready, 1 needs_work, 2 protocol_change_required
- [x] 6.4 Command errors if prepare.md missing or schema invalid
- [x] 6.5 Register prepare command in cli/index.ts

## 7. CLI mlspec run <rung> Command (preflight gate checker, NOT work executor)

- [x] 7.1 Update cli/index.ts to add run <experiment> <rung> syntax
- [x] 7.2 CLI validates prepare.md status=ready before allowing evidence
- [x] 7.3 CLI validates rung exists in protocol.evidence_ladder
- [x] 7.4 CLI validates evidence/<rung>.md schema when agent writes it
- [x] 7.5 Skill updates experiment status to running when first evidence is written; CLI validates consistency
- [x] 7.6 Remove old run logic that inferred stage from file existence
- [x] 7.7 CLI run command does NOT train models, write evidence, or invoke skills - it only validates gates

## 8. CLI mlspec resolve Command (preflight gate checker, NOT work executor)

- [x] 8.1 Create resolve command replacing accept/reject/retry/hold/inconclusive
- [x] 8.2 CLI validates can_resolve rung has evidence before allowing resolve
- [x] 8.3 CLI validates resolution.md schema when agent writes it
- [x] 8.4 Skill updates experiment status to resolved when resolution.md is written; CLI validates consistency
- [x] 8.5 CLI resolve command does NOT assess outcomes, write resolution.md, or invoke skills - it only validates gates

## 9. CLI mlspec amend protocol Command

- [ ] 9.1 Create amend protocol command
- [ ] 9.2 Record amendment reason
- [ ] 9.3 Validate no evidence collected yet (or warn)
- [ ] 9.4 Update protocol.md

## 10. Skill Template: mlspec-prepare (agent prompt for readiness checks)

- [x] 10.1 Create src/core/templates/workflows/mlspec-prepare.ts
- [x] 10.2 getMlspecPrepareSkillTemplate() instructs agent to:
  - Perform transform check, benchmark check, startup check, baseline availability
  - Write prepare.md with verification results
- [x] 10.3 Skill sets status=needs_work with blocking_issues if engineering bugs found
- [x] 10.4 Skill sets status=protocol_change_required if semantic issues found
- [x] 10.5 getMlspecPrepareCommandTemplate()
- [x] 10.6 Add mlspec-prepare to MLSPEC_WORKFLOWS in mlspec-workflows.ts

## 11. Skill Template: mlspec-propose Update

- [x] 11.1 Update to create protocol.md alongside experiment.yaml and hypothesis.md
- [x] 11.2 Instruct agent to prompt for evidence_ladder design (rungs, budgets, baselines)
- [x] 11.3 Instruct agent to prompt for compute_agreement
- [x] 11.4 Instruct agent to prompt for baseline_requirements per rung
- [x] 11.5 Update skill template instructions for V3

## 12. Skill Template: mlspec-run Update (agent prompt for evidence collection)

- [x] 12.1 Update skill template for rung-based evidence
- [x] 12.2 Instruct agent to train baseline_arm if required (or use existing)
- [x] 12.3 Instruct agent to train treatment_arm
- [x] 12.4 Instruct agent to run benchmark on both arms
- [x] 12.5 Instruct agent to compute comparison metrics
- [x] 12.6 Instruct agent to write evidence/<rung>.md with arm results and comparison
- [x] 12.7 Remove smoke/validation/final references

## 13. Skill Template: mlspec-resolve Update (agent prompt for outcome assessment)

- [x] 13.1 Update skill template for separated mechanistic/practical outcomes
- [x] 13.2 Instruct agent to assess mechanistic_outcome based on evidence
- [x] 13.3 Instruct agent to assess practical_outcome based on evidence
- [x] 13.4 Instruct agent to handle variant_accepted case (mechanistic failure + practical positive)
- [x] 13.5 Instruct agent to write resolution.md with separated outcomes
- [x] 13.6 Update command template for resolve command

## 14. Skill Template: mlspec-next Update

- [x] 14.1 Update routing to route to prepare if not done
- [x] 14.2 Update routing to use evidence_ladder_status (rung-based)
- [x] 14.3 Remove smoke/validation/final stage references
- [x] 14.4 Update existing_stages to existing_rungs

## 15. Skill Template: mlspec-explore Update

- [ ] 15.1 Update to suggest evidence ladder design
- [ ] 15.2 Update to note per-rung baseline requirements
- [ ] 15.3 Remove smoke/validation/final references

## 16. Protocol Documentation (AGENTS.md)

- [x] 16.1 Rewrite AGENTS.md in protocol.ts for V3
- [x] 16.2 Document CLI vs Skill responsibility boundary
- [x] 16.3 Document Prepare stage vs Evidence stage boundary
- [x] 16.4 Document evidence ladder concept
- [x] 16.5 Document separated resolution outcomes
- [x] 16.6 Document rung-based file structure

## 17. Init Command Update

- [x] 17.1 Update workspace_version to 3
- [x] 17.2 Update schema to ml-experiment-v3
- [x] 17.3 Update evaluation.md template for V3 structure

## 18. Tests Update

- [x] 18.1 Update test/mlspec/v2-schemas.test.ts for new schemas (renamed to v3-schemas.test.ts)
- [x] 18.2 Remove EvidenceStageSchema tests (completely removed)
- [x] 18.3 Add ProtocolMetadataSchema tests
- [x] 18.4 Add PrepareMetadataSchema tests
- [x] 18.5 Add RungEvidenceSchema tests
- [x] 18.6 Update test/mlspec/json-output.test.ts for rung-based evidence (V2 tests skipped)
- [x] 18.7 Update test/mlspec/v2-integration.test.ts for V3 workflow (renamed to v3-integration.test.ts)
- [x] 18.8 Update test/mlspec/mlspec-cli.test.ts for command changes

## 19. Cross-Platform Verification

- [ ] 19.1 Add Windows CI verification to test workflow
- [ ] 19.2 Verify all path.join() usage for evidence/<rung>.md paths
- [ ] 19.3 Verify Windows path handling in prepare.md creation
