---
name: ml-spec-audit-case
description: Run invariant audits on an ML experiment case. Use when verifying evidence validity or before issuing decisions.
license: MIT
compatibility: opencode
metadata:
  version: "0.1"
---

# SKILL CONTRACT

## Goal
Run invariant audits on a case to detect overclaiming, contamination, or policy violations before making decisions.

## Inputs
- Case ID
- Optional: specific run IDs to audit (audits all if not specified)

## Preconditions
- Case exists

## Default next steps
1. Run audit: `mlspec audit run --case-id <id> --json`
2. Review check results
3. If failures: report to user and suggest remediation
4. Proceed to decide-case only if audit passes or warnings are acceptable

## Required CLI mutations
- `mlspec audit run --case-id <id> --run-ids <ids> --json`
- `mlspec audit show --report-id <id> --json`

## Required local validations
- Check all invariant results before proceeding to decision
- Blocking failures must be remediated or explicitly accepted by human

## Maximum allowed claim
- This skill only reports audit results
- It cannot change evidence, runs, or decisions
- It can recommend remediation steps

## Refuse if
- Case does not exist
- Audit cannot run due to missing data

## Outputs
- AuditReport with check results
- bounded_summary: Summary of audit outcome explaining what passed, what failed, and implications for case status
- next_cheapest_step: For each failing check, suggest cheapest remediation step (e.g., "PLANNED_RUN_NOT_EVIDENCE: Cancel or cite the planned run", "SNAPSHOT_REQUIRED: Create snapshot before running full protocol")
- List of blocking invariants if any
- Suggested remediation steps for each failure

## Audit Checks Performed
1. PLANNED_RUN_NOT_EVIDENCE: Planned runs cited as evidence → BLOCK
2. RUN_STATUS_MISMATCH: Failed runs cited as success → BLOCK
3. CHERRY_PICK_DETECTED: Single run cherry-picked from siblings → WARN
4. RESOURCE_UNDERRUN: Underpowered run claimed as decision_grade → BLOCK
5. BASELINE_NOT_COMPARABLE: Baseline split/evaluator mismatch → BLOCK
6. SNAPSHOT_CONTAMINATION: Evidence from dirty snapshot → WARN
7. SNAPSHOT_REQUIRED: Evidence from run without snapshot → WARN
8. UNSUPPORTED_DECISION: Decision without sufficient evidence → BLOCK