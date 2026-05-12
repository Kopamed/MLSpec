## 1. Project Scaffold

- [x] 1.1 Set up TypeScript project with tsconfig.json (ESM, Node 18+)
- [x] 1.2 Create package.json with `mlspec` bin entry pointing to `dist/index.js`
- [x] 1.3 Create `build.ts` using Bun to compile `src/index.ts` → `dist/`
- [x] 1.4 Create `.mlspec/` directory structure for SQLite store location
- [x] 1.5 Set up SQLite dependency (better-sqlite3 or sql.js)

## 2. Type Definitions (src/types/)

- [x] 2.1 Define `Id` type (UUIDv7 string)
- [x] 2.2 Define `ResourceBudget` type with gpu_hours, wallclock_hours, data_fraction, seeds, epochs, accelerator_type?, peak_vram_gb?, num_devices?
- [x] 2.3 Define `Case` type with id, question, mode, status, current_protocol_id?, actor_ref, created_at
- [x] 2.4 Define `Protocol` type with id, case_id, version, objective, baseline_selector?, metric_spec, required_resources, min_decision_grade, locked_at?
- [x] 2.5 Define `Snapshot` type with id, case_id, commit_hash?, dirty_tree, diff_digest?, config_digests[], dataset_digests[], split_manifest_digest?, evaluator_digest?, environment_digest?, actor_ref, created_at
- [x] 2.6 Define `Run` type with id, case_id, protocol_id?, snapshot_id?, kind, status, command[], tracker_refs[], actual_resources?, output_refs[], started_at?, ended_at?
- [x] 2.7 Define `Deviation` type with id, run_id, category, severity, impact, note
- [x] 2.8 Define `Evidence` type with id, case_id, run_ids[], metrics[], grade, protocol_satisfied, baseline_run_ids?, deviation_ids[], summary
- [x] 2.9 Define `Claim` type with id, case_id, statement, scope, comparator?, target_metric?
- [x] 2.10 Define `Decision` type with id, case_id, claim_id, status, evidence_ids[], rationale, actor_ref, created_at
- [x] 2.11 Define `AuditReport` and `AuditCheck` types
- [x] 2.12 Define input types for all store operations (CreateCaseInput, BeginRunInput, etc.)

## 3. MLSpecStore Interface (src/store/)

- [x] 3.1 Define `MLSpecStore` interface with all CRUD methods
- [x] 3.2 Define `CreateCaseInput`, `DraftProtocolInput`, `BeginRunInput`, `EndRunInput`, `ClassifyEvidenceInput`, `CreateClaimInput`, `IssueDecisionInput`, `RecordDeviationInput`, `AuditScope`, `StatusScope` types
- [x] 3.3 Define `IdGenerator` utility using UUIDv7

## 4. SQLite Repository Adapter (src/store/sqlite/)

- [x] 4.1 Create SQLite store implementation with schema initialization
- [x] 4.2 Implement `createCase`, `getCase`, `listCases`
- [x] 4.3 Implement `draftProtocol`, `lockProtocol`, `getProtocol`
- [x] 4.4 Implement `createSnapshot`, `getSnapshot`
- [x] 4.5 Implement `beginRun`, `endRun`, `getRun`, `listRuns`
- [x] 4.6 Implement `recordDeviation`
- [x] 4.7 Implement `classifyEvidence` with grade computation logic
- [x] 4.8 Implement `createClaim`, `getClaim`
- [x] 4.9 Implement `issueDecision` with invariant checks
- [x] 4.10 Implement `audit` with all 8 invariant checks
- [x] 4.11 Implement `status` summary query

## 5. JSONL Debug Adapter (src/store/jsonl/)

- [x] 5.1 Create JSONL adapter implementing same MLSpecStore interface
- [x] 5.2 Use append-only events.jsonl per case under .mlspec/cases/<case_id>/
- [x] 5.3 Materialize current state from events on read

## 6. Repository Factory (src/store/index.ts)

- [x] 6.1 Export `createStore` function that returns SQLite adapter by default
- [x] 6.2 Support `MLSPEC_STORE adapter=jsonl` env var to use JSONL instead

## 7. CLI Commands (src/cli/)

- [x] 7.1 Create main entry point `src/index.ts` with argument parsing
- [x] 7.2 Implement `case create` command with JSON envelope output
- [x] 7.3 Implement `case show`, `case list`, `case archive` commands
- [x] 7.4 Implement `protocol draft`, `protocol lock`, `protocol show` commands
- [x] 7.5 Implement `snapshot create`, `snapshot show` commands
- [x] 7.6 Implement `run begin`, `run end`, `run show`, `run list` commands
- [x] 7.7 Implement `evidence classify`, `evidence show` commands
- [x] 7.8 Implement `claim create`, `claim show` commands
- [x] 7.9 Implement `decision issue`, `decision show` commands
- [x] 7.10 Implement `audit run`, `audit show` commands
- [x] 7.11 Implement `status` summary command
- [x] 7.12 Implement `import from mlflow` command
- [x] 7.13 Add `--json` flag to all commands for structured output
- [x] 7.14 Implement standard JSON envelope with `ok`, `command`, `data`, `warnings`, `meta`

## 8. Evidence Grading Engine (src/grading/)

- [x] 8.1 Implement `computeGrade` function: takes Run, Protocol, Deviations, Snapshot, baseline comparability → returns grade
- [x] 8.2 Implement `resourceRatio` calculation: actual vs required per dimension
- [x] 8.3 Implement `minimumCompletenessRatio` across gpu_hours, data_fraction, epochs, seeds
- [x] 8.4 Implement `checkDeviationCaps`: fatal → invalid, material unresolved → caps at partial
- [x] 8.5 Implement `checkBaselineComparability`: split, evaluator, metric must match
- [x] 8.6 Return grade, protocol_satisfied, and warnings array

## 9. Audit Engine (src/audit/)

- [x] 9.1 Implement `PLANNED_RUN_NOT_EVIDENCE` check
- [x] 9.2 Implement `RUN_STATUS_MISMATCH` check
- [x] 9.3 Implement `CHERRY_PICK_DETECTED` check
- [x] 9.4 Implement `RESOURCE_UNDERRUN` check
- [x] 9.5 Implement `BASELINE_NOT_COMPARABLE` check
- [x] 9.6 Implement `SNAPSHOT_CONTAMINATION` check
- [x] 9.7 Implement `SNAPSHOT_REQUIRED` check
- [x] 9.8 Implement `UNSUPPORTED_DECISION` check
- [x] 9.9 Implement `audit()` function that runs all checks and returns AuditReport

## 10. OpenCode Skills (.opencode/skills/)

- [x] 10.1 Create `ml-spec-frame-case/SKILL.md` skill with contract for defining questions and drafting protocols
- [x] 10.2 Create `ml-spec-run-candidate/SKILL.md` skill with contract for executing structured experiments
- [x] 10.3 Create `ml-spec-decide-case/SKILL.md` skill with contract for issuing bounded decisions
- [x] 10.4 Create `ml-spec-audit-case/SKILL.md` skill with contract for running invariant audits
- [x] 10.5 Write skill descriptions specific enough for OpenCode intent routing

## 11. Adversarial Fixtures (src/__fixtures__/)

- [x] 11.1 Write fixture: planned run cited as evidence → PLANNED_RUN_NOT_EVIDENCE
- [x] 11.2 Write fixture: failed run cited as success → RUN_STATUS_MISMATCH
- [x] 11.3 Write fixture: wrong split matched as baseline → BASELINE_NOT_COMPARABLE
- [x] 11.4 Write fixture: evaluator script changed → EVALUATOR_DIGEST_MISMATCH
- [x] 11.5 Write fixture: underpowered run promoted to decision_grade → RESOURCE_UNDERRUN downgrade
- [x] 11.6 Write fixture: single-seed cherry-picked from siblings → CHERRY_PICK_DETECTED
- [x] 11.7 Write fixture: dirty workspace without snapshot → SNAPSHOT_REQUIRED
- [x] 11.8 Write fixture: brownfield import backfills dataset lineage → IMPORTED_RUN_LACKS_FULL_LINEAGE
- [x] 11.9 Write fixture: decision issued without claim → EVIDENCE_REQUIRED
- [x] 11.10 Write fixture: code edited after evidence-bearing run → SNAPSHOT_CONTAMINATION
- [x] 11.11 Write fixture: interrupted/OOM run treated as complete → RUN_INTERRUPTED_NOT_INVALID
- [x] 11.12 Write fixture: Kubeflow recurring run with changed parameters but same claim → PROTOCOL_VERSION_DRIFT
- [x] 11.13 Create test runner that executes all fixtures and verifies blocking behavior

## 12. CLI Build & Package

- [x] 12.1 Add `mlspec init` command to scaffold `.mlspec/` directory
- [x] 12.2 Add `mlspec --version` and `mlspec --help` commands
- [x] 12.3 Verify build.ts produces working `dist/index.js`
- [x] 12.4 Test CLI works: `bun src/index.ts case create --question "test" --json`
- [x] 12.5 Test full end-to-end loop: create case → draft protocol → create snapshot → begin run → end run → classify evidence → create claim → issue decision

## 13. Documentation

- [x] 13.1 Write README with installation and quick-start
- [x] 13.2 Write SKILL.md files with human-readable descriptions for each skill
- [x] 13.3 Document the JSON envelope format
