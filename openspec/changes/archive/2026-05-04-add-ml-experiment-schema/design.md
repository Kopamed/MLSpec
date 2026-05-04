## Context

OpenSpec's existing `spec-driven` schema supports software changes with a proposal → specs → design → tasks workflow. This change adds a new `ml-experiment` schema to support machine learning experimentation workflows.

The goal is schema-only: leverage OpenSpec's existing artifact graph, schema loader, status command, instructions command, and `/opsx:continue`/`/opsx:apply` skills without modification.

## Goals / Non-Goals

**Goals:**
- Enable ML experimentation structured as artifacts: experiment → protocol → prepare → evidence → resolution
- Force clarity on hypothesis, baseline, controls, metrics, budget, and success criteria before running experiments
- Capture evidence and support decision resolution (accepted/rejected/inconclusive/invalid/needs-rerun)
- Work with existing OpenSpec skills and commands (no new CLI, skills, or state machine)

**Non-Goals:**
- Custom MLSpec CLI
- Baseline registry or experiment tracker database
- Dashboard or visualization
- Compute/time budget enforcement mechanism
- Wizard-like or bureaucratic workflow

## Decisions

### Decision: Schema-only implementation

The ml-experiment schema uses OpenSpec's existing artifact graph machinery. No new CLI commands, skills, or core changes.

**Rationale:** Dogfood existing infrastructure. If gaps emerge, they become clear through experimentation, not upfront design.

**Alternative considered:** Custom `mlspec` CLI → Rejected: violates schema-only constraint

### Decision: Reuse existing `/opsx:continue` and `/opsx:apply` skills unchanged

The existing skills are schema-aware and consume CLI state from `openspec status` and `openspec instructions`. They require no modifications to support the ml-experiment schema.

**Mechanism:**
- `/opsx:continue` calls `openspec status --json` → parses ready artifacts, calls `openspec instructions <artifact> --json` → creates artifact
- `/opsx:apply` calls `openspec instructions apply --json` → gets contextFiles, tracks file, tasks → implements and marks checkboxes

**Rationale:** Skills are generic and schema-driven. Adding schema-specific behavior in skills would violate the schema-only principle.

### Decision: 5 artifacts with linear dependency chain

```
experiment → protocol → prepare → evidence → resolution
```

**Rationale:** Simple, linear flow matches ML experimental process:
1. Frame question (experiment)
2. Define methodology (protocol)
3. Prepare implementation (prepare)
4. Capture results (evidence)
5. Draw conclusions (resolution)

**Alternative considered:** More granular artifacts (e.g., separate baseline artifact) → Over-engineered for MVP

### Decision: Apply phase tracks prepare.md

The `apply` block in schema.yaml:
```yaml
apply:
  requires: [prepare]
  tracks: prepare.md
```

**Rationale:** "Doing" happens in prepare (implementing configs, eval harness, smoke checks). Evidence and resolution are documentation, not implementation work. Tracking them as checkboxes would add friction without value.

### Decision: Single evidence.md file (not glob)

The evidence artifact generates `evidence.md` (single file).

**Rationale:** Simplest for MVP. A single file works with existing `detectCompleted` (file existence check). If multi-run evidence becomes necessary, can change to `evidence/**/*.md` later.

### Decision: Templates designed for EOS dogfood example

The templates are designed around a concrete example: testing whether adding an EOS token fixes runaway generation in a language model.

**Rationale:** Concrete example forces realistic template content. Abstract templates tend to miss important sections.

## Artifact Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    ML Experiment Workflow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  experiment.md                                                  │
│    Frame: hypothesis, mechanism, intervention,                  │
│           baseline, decision target                              │
│           │                                                     │
│           ▼                                                     │
│  protocol.md                                                    │
│    Define: baseline/treatment, controls, metrics,               │
│            budget, success criteria, invalidation               │
│            │                                                    │
│            ▼                                                    │
│  prepare.md                                                     │
│    Implement: configs, eval harness, smoke checks,               │
│              logging, budget readiness                          │
│              │                                                  │
│              │ apply.tracks: prepare.md                         │
│              ▼                                                  │
│  evidence.md                                                    │
│    Record: commands, configs, commits, metrics,                 │
│            samples, artifacts, deviations, validity             │
│            │                                                    │
│            ▼                                                    │
│  resolution.md                                                  │
│    Decide: accepted/rejected/inconclusive/invalid/needs-rerun   │
│            cost, next step                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Schema File Structure

```
schemas/ml-experiment/
├── schema.yaml
└── templates/
    ├── experiment.md
    ├── protocol.md
    ├── prepare.md
    ├── evidence.md
    └── resolution.md
```

### schema.yaml Structure

```yaml
name: ml-experiment
version: 1
description: ML experimentation workflow - hypothesis to evidence to decision

artifacts:
  - id: experiment
    generates: experiment.md
    description: Frame the ML question, hypothesis, mechanism, and decision target
    template: experiment.md
    instruction: |
      Define the ML experiment...
    requires: []

  - id: protocol
    generates: protocol.md
    description: Define baseline/treatment, controls, metrics, budget, and success criteria
    template: protocol.md
    requires: [experiment]

  - id: prepare
    generates: prepare.md
    description: Implementation, configs, eval harness, smoke checks, budget readiness
    template: prepare.md
    requires: [protocol]

  - id: evidence
    generates: evidence.md
    description: Record what actually ran: commands, configs, commits, metrics, deviations
    template: evidence.md
    requires: [prepare]

  - id: resolution
    generates: resolution.md
    description: Turn evidence into a decision: accepted/rejected/inconclusive/invalid
    template: resolution.md
    requires: [evidence]

apply:
  requires: [prepare]
  tracks: prepare.md
```

## Risks / Trade-offs

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema doesn't fit ML work style | Medium | High | Dogfood reveals; schema is editable |
| Template format awkward for agents | Medium | Medium | Adjust templates based on dogfood |
| Single evidence file too limiting | Low (MVP) | Low | Change to glob later if needed |
| No compute/time budget enforcement | Known gap | Low | Budget tracked in templates; automatic enforcement not MVP scope |

## Open Questions

1. Should evidence support multiple runs (e.g., `evidence/run-1.md`, `evidence/run-2.md`)?
2. Should there be a baseline artifact separate from experiment?
3. Should prepare.md track sub-tasks by default or remain simple?
4. Does the EOS token dogfood reveal template gaps?

## Migration Plan

1. Add `schemas/ml-experiment/` to package built-in schemas
2. Templates use the existing template loading mechanism (no changes to core)
3. No migration needed - new schema only
4. Rollback: remove the schema directory

## Next Steps

- Dogfood with EOS token experiment
- Evaluate if schema/templates need adjustment based on actual use
- Consider evidence glob pattern if single file proves limiting
