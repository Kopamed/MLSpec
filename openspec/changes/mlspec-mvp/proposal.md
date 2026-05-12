## Why

ML experiments run by AI agents routinely produce conclusions that exceed the strength of the evidence: a single seed run claimed as proof, a proxy run treated as final, a failed run cited as success. Existing MLflow/Kubeflow trackers log what happened but have no concept of whether the result justifies the conclusion. MLSpec is the validity layer that closes this gap — it binds experiments to protocols, grades evidence by resource consumption, and gates decisions by what the evidence can actually support.

## What Changes

- **New MLSpec CLI** (`mlspec`) with typed commands for case/protocol/snapshot/run/evidence/claim/decision/audit
- **JSON-first machine interface** with standard envelope (`{ok, command, data, warnings, meta}`) for agent consumption
- **Compute-aware evidence grading** — evidence grade is computed by the CLI from resource consumption ratios, not claimed by the agent
- **Decision gating** — accept/reject requires explicit evidence citation and invariant checks; unsupported decisions are blocked with machine-readable blockers
- **Agent skills** for OpenCode (8 skills): `ml-spec-frame-case`, `ml-spec-run-candidate`, `ml-spec-decide-case`, `ml-spec-audit-case`, `ml-spec-import-project`, `ml-spec-compare-to-baseline`, `ml-spec-patch-code`, `ml-spec-handoff-state`
- **SQLite store** with JSONL debug adapter; storage abstracted behind a repository interface for future Postgres swap
- **Adversarial fixture suite** — executable tests that verify the system blocks overclaiming

## Capabilities

### New Capabilities

- `case-centric-provenance`: Core nouns (Case, Protocol, Snapshot, Run, Deviation, Evidence, Claim, Decision) and state transitions. Preserves the distinction between "what happened" and "what is allowed to be concluded."
- `compute-aware-evidence-grading`: Evidence grade is computed by the CLI from resource_completeness ratio, not claimed by the agent. Grades: smoke < proxy < partial < decision_grade < replicated. Prevents underpowered runs from supporting strong conclusions.
- `decision-gating`: Decision issuance requires cited evidence refs, minimum evidence grade, and passing invariant checks. Blocked decisions return `{ok: false, code, blocking_invariants, suggested_next_actions}`.
- `audit-engine`: Machine-readable invariant checks that catch: planned-run-as-evidence, failed-run-as-success, cherry-picking siblings, underpowered run promoted to decision_grade, missing snapshot on evidence-bearing run.
- `skill-based-agent-interface`: OpenCode skills that wrap the CLI. The agent loads a skill, follows bounded steps, invokes CLI commands, and returns structured output. Skills have refusal conditions and max-allowed-claim rules. MVP ships 8 skills: `frame-case`, `run-candidate`, `decide-case`, `audit-case`, `import-project`, `compare-to-baseline`, `patch-code`, `handoff-state`.
- `brownfield-import`: Strict import from MLflow/Kubeflow/repo scan. Inferred lineage is marked `confidence: low` and capped at partial grade. Unknowns are preserved, not backfilled.

### Modified Capabilities

None — this is a greenfield capability set.

## Impact

MLSpec IS a local-first control plane for protocol, evidence, and decisions. It IS a provenance graph for runs, artifacts, and agent actions. It IS NOT the following:

| MLSpec is NOT | Because |
|---|---|
| A Kubernetes-first platform | Local-first, adapter-based integration |
| A tracker that only logs metrics | Validity layer with evidence grading |
| A scheduler or trainer | Control plane only |
| A heavyweight MLOps stack | Thin layer, focused on decision gating |

- **New package**: `mlspec` CLI published as an npm package
- **New directory**: `.mlspec/` for SQLite store, session context, case projections
- **New directory**: `.opencode/skills/ml-spec-*/` for OpenCode skill definitions
- **Storage**: SQLite for canonical state, JSONL for debug/event mirroring
- **Agent integration**: Skills discovered via OpenCode skill tool; CLI invoked as subprocess with `--json` flag
