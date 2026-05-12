## Context

ML experiments run by AI agents need a control plane that enforces "you cannot conclude X from evidence Y." Existing experiment trackers (MLflow, Kubeflow) log execution metadata but have no validity semantics — they cannot distinguish a decision-grade result from a smoke test. The MLSpec CLI fills this gap as the thin waist between flexible agent behavior and durable experimental truth.

The human speaks intent to the agent; the agent loads MLSpec skills and invokes CLI commands; the CLI owns state transitions, evidence grading, and decision gating; the store persists authoritative records.

## Goals / Non-Goals

**Goals:**
- CLI control plane with typed commands for Case, Protocol, Snapshot, Run, Deviation, Evidence, Claim, Decision, Audit
- Compute-aware evidence grading: CLI computes grade from resource ratio, agent cannot claim a grade
- Decision gating: accept/reject requires cited evidence and passing invariants; blocked decisions return machine-readable blockers
- Agent-facing skills (OpenCode) that wrap CLI commands with refusal conditions and max-allowed-claim rules
- SQLite canonical store with repository interface; JSONL debug adapter
- Adversarial fixture suite that verifies overclaiming is blocked

**Non-Goals:**
- Web UI or dashboard
- Multi-user concurrency (single-writer SQLite for MVP)
- Kubeflow/MLflow orchestration — adapters for import only, not execution
- Full Artifact/MetricResult/Actor nouns — deferred to v1
- TUI or interactive REPL mode

## Decisions

### 1. SQLite as canonical store, JSONL as debug adapter

**Decision**: SQLite is the default store. One append-only `events.jsonl` per case mirrors all mutations for debug/audit/replication.

**Rationale**: Typed queries, ACID transactions, indexes, enough concurrency for single-user MVP. JSONL is not the canonical store because cross-record joins are impractical at scale. A repository interface (`MLSpecStore`) abstracts reads/writes so the adapter can be swapped to Postgres in v1 without changing CLI code.

**Alternatives considered**:
- Pure JSONL: rejected because joins across cases/runs/evidence require loading all records; not queryable
- Markdown files: rejected because provenance requires relational integrity; markdown is a projection, not a source

### 2. JSON envelope as CLI output contract

**Decision**: Every CLI command returns a JSON envelope. Agents always pass `--json`.

```json
{
  "ok": true,
  "command": "run.begin",
  "data": { "run_id": "...", "case_id": "...", "protocol_id": "..." },
  "warnings": [],
  "meta": { "schema_version": "0.1.0", "store_revision": 184 }
}
```

Failure envelope:
```json
{
  "ok": false,
  "command": "decision.issue",
  "code": "INSUFFICIENT_EVIDENCE",
  "message": "Claim cannot be resolved as accept/reject.",
  "data": { "claim_id": "...", "requested_status": "accept", "max_allowed_status": "inconclusive", "evidence_cap": "partial" },
  "blocking_invariants": ["BASELINE_NOT_COMPARABLE", "RESOURCE_UNDERRUN", "MISSING_DISPERSION"],
  "suggested_next_actions": ["rerun with protocol-required seeds=5", "attach matched baseline on identical split+evaluator"],
  "meta": { "schema_version": "0.1.0" }
}
```

**Rationale**: Agents parse IDs from `data` field to chain commands. Blocked decisions surface `blocking_invariants` and `suggested_next_actions` so the agent can recover without guessing.

**Alternatives considered**:
- Human-readable text by default: rejected because agents need structured output; human readability is a TTY-mode fallback
- Separate success/failure schemas: rejected because envelope pattern is simpler for agents

### 3. Evidence grade is computed, not claimed

**Decision**: `mlspec evidence classify` takes run metadata and resources as input; the CLI computes the grade from the protocol threshold and actual resources. The agent cannot claim a grade — only the CLI can compute one.

**Evidence grade rubric (default)**:

| Grade | Resource requirement | Additional conditions |
|---|---|---|
| `smoke` | < 10% of planned GPU-hours | may have no comparator |
| `proxy` | 10–30% of planned compute | comparator helpful but not required |
| `partial` | 30–99% OR full compute with missing baseline/variance/deviation | split and metric explicit |
| `decision_grade` | >= 100% on gpu_hours, data_fraction, epochs, seeds | matched baseline, evaluator digest, variance reported (multiple seeds), no unresolved deviations |
| `replicated` | decision_grade + explicit replication strategy satisfied | independent rerun or second seed bundle |
| `invalid` | fatal deviation, lineage hole, noncomparable baseline | none |

**Rationale**: This is the core MLSpec invariant. If the agent could claim a grade, it could overclaim. Only the CLI — applying deterministic rules — can compute what the evidence actually supports.

### 4. Skills are imperative contracts, not prompt templates

**Decision**: Each skill is a `SKILL.md` file with frontmatter (`name`, `description`) and a structured plain-text contract:

```
SKILL CONTRACT
Goal:
Inputs:
Preconditions:
Default next steps:
Required CLI mutations:
Required local validations:
Maximum allowed claim:
Refuse if:
Outputs:
```

**Rationale**: The contract form encodes what the agent is allowed to do, what facts must be recorded, and what the strongest allowed claim is. A skill is loaded by the agent, which then follows the bounded steps and invokes CLI commands. The skill never writes MLSpec state — only the CLI does.

**Alternatives considered**:
- Prompt template only: rejected because it doesn't encode refusal conditions, max-claim bounds, or step sequences
- Full imperative script: rejected because the agent needs flexibility to branch based on CLI responses

### 5. Repository interface separates storage from CLI

**Decision**: The `MLSpecStore` interface is the only layer that reads/writes typed nouns. CLI commands delegate to store methods. SQLite adapter and JSONL adapter both implement the same interface.

```typescript
interface MLSpecStore {
  createCase(input: CreateCaseInput): Case;
  getCase(id: Id): Case | null;
  listCases(filter?: CaseFilter): Case[];

  draftProtocol(input: DraftProtocolInput): Protocol;
  lockProtocol(caseId: Id, protocolId: Id): Protocol;

  createSnapshot(input: CreateSnapshotInput): Snapshot;

  beginRun(input: BeginRunInput): Run;
  endRun(runId: Id, input: EndRunInput): Run;

  recordDeviation(input: RecordDeviationInput): Deviation;
  classifyEvidence(input: ClassifyEvidenceInput): Evidence;

  createClaim(input: CreateClaimInput): Claim;
  issueDecision(input: IssueDecisionInput): Decision;

  audit(scope: AuditScope): AuditReport;
  status(scope: StatusScope): StatusReport;
}
```

**Rationale**: The CLI should not know or care whether the store is SQLite or JSONL. If Postgres is needed in v1, only the adapter changes — not the CLI commands or the envelope contract.

### 6. Adversarial fixtures drive test strategy

**Decision**: The test suite is organized around adversarial fixtures that attempt to produce unsupported evidence or decisions. The system must block or flag each one.

Minimum fixture set:
1. planned run cited as evidence → `PLANNED_RUN_NOT_EVIDENCE`
2. failed run cited as success → `RUN_STATUS_MISMATCH`
3. wrong split matched as baseline → `BASELINE_NOT_COMPARABLE`
4. evaluator script changed → `EVALUATOR_DIGEST_MISMATCH`
5. underpowered run promoted to decision_grade → `RESOURCE_UNDERRUN` downgrade
6. single-seed cherry-picked from siblings → `NO_SELECTION_RULE`
7. dirty workspace without snapshot → `SNAPSHOT_REQUIRED`
8. brownfield import backfills dataset lineage → `UNKNOWN_LINEAGE_CAPPED_PARTIAL`
9. decision issued without claim → `CLAIM_REQUIRED`
10. code edited after evidence-bearing run → `SNAPSHOT_CONTAMINATION`
11. interrupted/OOM run treated as complete → `RUN_INTERRUPTED_NOT_INVALID`
12. Kubeflow recurring run with changed parameters but same claim → `PROTOCOL_VERSION_DRIFT`

**Rationale**: DSR evaluation: the artifact is only successful if it prevents the failures it exists to stop. These fixtures are the acceptance criteria.

## Risks / Trade-offs

- **[Risk] Agent infers "worth it" differently than MLSpec's rubric** → Mitigation: Skills default to conservative interpretation (scratch mode unless case is explicitly promoted). Human can override mode.
- **[Risk] CLI computed grade disagrees with agent's expectation** → Mitigation: `evidence classify` returns the computed grade and all warnings. Agent can inspect blockers before attempting a decision.
- **[Risk] Snapshot captures dirty tree** → Mitigation: Snapshot records `dirty_tree: true`. Evidence grade is capped if snapshot is dirty and no explicit override is recorded.
- **[Risk] Brownfield import infers wrong baseline** → Mitigation: All inferences are marked `confidence: low`. Baseline must be explicitly verified by agent before it is comparability-eligible.
- **[Risk] Agent chains commands incorrectly** → Mitigation: Each JSON envelope includes the IDs needed for the next step. Skills encode the step sequence explicitly.

## Migration Plan

**v0.1.0 — MVP**:
1. Implement `MLSpecStore` interface with SQLite adapter
2. Implement all 10 CLI command groups with JSON envelope output
3. Implement evidence grading engine (compute from resource ratio + deviations)
4. Implement audit engine (8 invariant checks)
5. Create 4 OpenCode skills: `ml-spec-frame-case`, `ml-spec-run-candidate`, `ml-spec-decide-case`, `ml-spec-audit-case`
6. Write adversarial fixture suite; CI gates on 100% fixture pass

**v0.2.0**:
1. JSONL debug adapter implementing `MLSpecStore`
2. `mlspec init` scaffolding command
3. `mlspec status` human-readable summary view

**v1.0**:
1. Postgres adapter (same interface)
2. MLflow import adapter
3. Full `Artifact` and `Actor` nouns
4. `mlspec import from kubeflow`

## Open Questions

- **Secret handling**: MLSpec stores references to secrets (tracker credentials), not secrets themselves. Host env var or secret manager integration deferred to post-MVP.
- **Multi-agent coordination**: Single agent for MVP. handoff_state skill preserves context across sessions but does not handle concurrent writers.
- **Dirty workspace policy**: Snapshot records `dirty_tree: true` and caps evidence grade. Whether to allow dirty snapshot at all (with grade cap) or require clean tree is a policy decision deferred to v1.
