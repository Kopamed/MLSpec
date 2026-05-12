---
name: ml-spec-run-candidate
description: Execute a structured ML experiment run. Use when the user wants to train/evaluate a model and record the results.
license: MIT
compatibility: opencode
metadata:
  version: "0.1"
---

# SKILL CONTRACT

## Goal
Execute a structured ML experiment run that produces evidence for a framed case.

## Inputs
- Case ID from frame-case
- Protocol ID (should be locked before running)
- Snapshot ID (must exist before run begins)
- Run kind: smoke | proxy | full | replication
- Command to execute
- Tracker refs (e.g., MLflow run ID, W&B run ID)

## Preconditions
- Case exists and is in "ready" or "running" status
- Protocol is locked
- Snapshot exists with clean tree (dirty_tree=false) if possible
- Workspace matches snapshot commit_hash

## Default next steps
1. Create snapshot if not exists: `mlspec snapshot create`
2. Begin run: `mlspec run begin --case-id <id> --protocol-id <pid> --snapshot-id <sid> --kind <kind> --command <cmd>`
3. Execute the command
4. End run: `mlspec run end --run-id <rid> --status completed --actual-resources <resources> --output-refs <refs>`
5. Record deviations if any: `mlspec deviation record --run-id <rid> ...`
6. Classify evidence: `mlspec evidence classify --case-id <id> --run-ids <rid>`

## Required CLI mutations
- `mlspec snapshot create --case-id <id> --commit-hash <hash> --dirty-tree false --actor-ref <actor> --json`
- `mlspec run begin --case-id <id> --protocol-id <pid> --snapshot-id <sid> --kind <kind> --command <cmd> --tracker-refs <refs> --actor-ref <actor> --json`
- `mlspec run end --run-id <id> --status <status> --gpu-hours <n> --wallclock-hours <n> --data-fraction <n> --seeds <n> --epochs <n> --output-refs <refs> --json`

## Required local validations
- Workspace is clean (no uncommitted changes) before snapshot
- Command matches the protocol objective
- Actual resources are recorded truthfully
- Any deviation from protocol is declared immediately

## Maximum allowed claim
- smoke: < 10% of planned resources, no comparator needed
- proxy: 10-30% of planned resources, comparator helpful
- partial: 30-99% OR full with missing baseline/variance/deviation
- decision_grade: >= 100% on all dimensions, matched baseline, variance reported, no unresolved deviations
- replicated: decision_grade + replication strategy satisfied

**You cannot claim a grade — only the CLI computes it via `evidence classify`.**

## Refuse if
- Workspace has uncommitted changes and no snapshot exists
- Running without a locked protocol
- Command diverges significantly from protocol objective without declaration
- Cannot report actual resources (hiding what actually happened)

## Outputs
- Run ID (from run.begin response)
- Evidence ID and computed grade (from evidence.classify response)
- audit_report: Full AuditReport with all check results
- bounded_summary: Summary explaining what the evidence grade means and what it permits (e.g., "Evidence is decision_grade. Accept/reject decisions are allowed.")
- next_cheapest_step: If grade is below decision_grade, suggest the cheapest way to improve (e.g., "Run 4 more seeds to achieve variance reporting")
- Any warnings about resource underrun or deviation caps