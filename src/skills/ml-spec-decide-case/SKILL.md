---
name: ml-spec-decide-case
description: Issue a bounded decision on an ML experiment claim. Use when the user wants to accept/reject a claim based on evidence.
license: MIT
compatibility: opencode
metadata:
  version: "0.1"
---

# SKILL CONTRACT

## Goal
Issue a bounded decision (accept/reject/inconclusive/rerun/archive) on a claim, citing the available evidence.

## Inputs
- Case ID
- Claim ID
- Decision status: accept | reject | inconclusive | rerun | archive
- Evidence IDs (must be decision_grade or replicated for accept/reject)
- Rationale: explanation of why this decision was made

## Preconditions
- Case has at least one claim
- Evidence exists that was classified at decision_grade or higher
- No blocking invariants from audit

## Default next steps
1. Run audit: `mlspec audit run --case-id <id>`
2. Review blocking invariants if any
3. Create claim if not exists: `mlspec claim create --case-id <id> --statement <stmt> --scope <scope>`
4. Issue decision: `mlspec decision issue --case-id <id> --claim-id <cid> --status <status> --evidence-ids <ids> --rationale <text>`

## Required CLI mutations
- `mlspec audit run --case-id <id> --json`
- `mlspec claim create --case-id <id> --statement <stmt> --scope <scope> --expected-direction <dir> --target-metric <metric> --actor-ref <actor> --json`
- `mlspec decision issue --case-id <id> --claim-id <cid> --status <status> --evidence-ids <ids> --rationale <text> --actor-ref <actor> --json`

## Required local validations
- Evidence cited is actually decision_grade or higher
- Claim exists and matches the evidence scope
- Audit passes (no blocking invariants)
- For accept/reject: must have decision_grade evidence with comparable baseline and variance

## Maximum allowed claim
- accept: requires decision_grade or replicated evidence with no blocking invariants
- reject: requires evidence showing claim is false, with no blocking invariants
- inconclusive: evidence exists but doesn't support accept or reject
- rerun: evidence suggests running more iterations/seeds would clarify
- archive: case is no longer relevant or was superseded

**Cannot issue accept/reject without passing all invariant checks.**

## Refuse if
- Audit shows blocking invariants (e.g., PLANNED_RUN_NOT_EVIDENCE, RESOURCE_UNDERRUN)
- Evidence grade is below decision_grade (must use inconclusive or rerun)
- Claim scope doesn't match evidence scope
- No baseline comparability

## Outputs
- Decision ID (from decision.issue response)
- Confirmation of decision status
- audit_report: AuditReport from the pre-decision audit showing all checks passed/failed
- bounded_summary: Summary explaining what changed, what evidence exists, and what is allowed next
- next_cheapest_step: If audit passes but evidence grade is below decision_grade, suggest cheapest remediation (e.g., "Run 2 more seeds to achieve variance for decision_grade", "Achieve comparable baseline by locking protocol and creating clean snapshot")
- Any warnings about limitations or next steps