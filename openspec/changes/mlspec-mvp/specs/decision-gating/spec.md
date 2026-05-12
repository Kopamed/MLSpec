## ADDED Requirements

### Requirement: Decision requires cited evidence

The system SHALL require that every Decision cites at least one Evidence record via `evidence_ids[]`. A Decision without cited Evidence SHALL NOT be created.

A Decision also requires a `claim_id` referencing a Claim. A Claim requires: `statement`, `scope`, `comparator?`, `target_metric?`.

#### Scenario: Issue decision with valid evidence
- **WHEN** `mlspec decision issue --case <id> --claim <claim-id> --evidence <evidence-id> --status accept --rationale "metric exceeds threshold"` is called
- **AND** the Evidence grade is `decision_grade` or `replicated`
- **AND** all comparability invariants pass
- **THEN** the system SHALL create the Decision with `status: accept`
- **AND** return the Decision with `id` and `created_at`

#### Scenario: Decision without evidence is rejected
- **WHEN** `mlspec decision issue --case <id> --claim <claim-id> --status accept` is called with no `--evidence` flags
- **THEN** the system SHALL reject with `code: EVIDENCE_REQUIRED`
- **AND** no Decision is created

### Requirement: Decision status enum

The system SHALL support these Decision statuses: `accept`, `reject`, `inconclusive`, `rerun`, `archive`.

`accept` and `reject` require evidence grade `decision_grade` or `replicated`. `inconclusive` is allowed with `smoke`, `proxy`, or `partial` evidence. `rerun` is required when evidence is `invalid` or a required run is missing. `archive` closes the case without a live decision.

#### Scenario: Accept requires decision_grade evidence
- **WHEN** `mlspec decision issue --case <id> --claim <claim-id> --evidence <evidence-id> --status accept` is called
- **AND** the Evidence grade is `partial`
- **THEN** the system SHALL reject with `code: EVIDENCE_GRADE_INSUFFICIENT`
- **AND** `data.max_allowed_status` SHALL be `inconclusive`
- **AND** `blocking_invariants` SHALL include `GRADE_INSUFFICIENT_FOR_ACCEPT`

#### Scenario: Reject with negative decision_grade is valid
- **WHEN** a Decision is issued with `status: reject`
- **AND** the cited Evidence has grade `decision_grade` showing the metric decreased
- **THEN** the system SHALL accept the Decision
- **AND** `decision_grade` measures evidentiary strength, not positivity

### Requirement: Blocked decisions return machine-readable blockers

When a Decision cannot be issued at the requested status, the system SHALL return `ok: false` with:
- `code`: machine-readable error code (e.g., `INSUFFICIENT_EVIDENCE`)
- `data`: { claim_id, requested_status, max_allowed_status, evidence_cap }
- `blocking_invariants[]`: list of specific invariant names that failed
- `suggested_next_actions[]`: list of concrete steps to resolve blockers

The agent can parse these fields and report to the human or attempt to resolve the blockers.

#### Scenario: Blocked decision returns suggested actions
- **WHEN** `mlspec decision issue` is called but evidence grade is insufficient
- **THEN** the system SHALL return:
  ```json
  {
    "ok": false,
    "code": "INSUFFICIENT_EVIDENCE",
    "blocking_invariants": ["GRADE_INSUFFICIENT_FOR_ACCEPT", "MISSING_DISPERSION"],
    "suggested_next_actions": [
      "rerun with protocol-required seeds=5",
      "attach matched baseline on identical split+evaluator"
    ]
  }
  ```

### Requirement: Claim is explicit and scoped

A Claim MUST have: `statement` (what is being asserted), `scope` (the boundary of the claim), `comparator?` (what it is compared against; omit for non-comparative claims), `expected_direction?` (max | min; optional), and `target_metric?` (the metric name being evaluated).

Free-form text alone is insufficient. The Claim structure prevents vague assertions like "X helps" without specifying in what way, compared to what, measured how.

#### Scenario: Create claim with full structure
- **WHEN** `mlspec claim create --case <id> --statement "Label smoothing improves test accuracy" --scope "MNIST, 3 random seeds, 100 epochs, GPU-hours <= 12" --comparator "baseline without label smoothing" --target-metric accuracy`
- **THEN** the system creates a Claim with all fields
- **AND** the Claim can be used in a Decision

#### Scenario: Claim without comparator for non-comparative claim
- **WHEN** `mlspec claim create --case <id> --statement "Model achieves > 92% accuracy" --scope "MNIST test split" --target-metric accuracy` is called without `--comparator`
- **THEN** the system creates a non-comparative Claim
- **AND** the Evidence does not require a baseline for comparison
