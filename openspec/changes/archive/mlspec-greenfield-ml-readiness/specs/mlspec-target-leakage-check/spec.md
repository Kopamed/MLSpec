# mlspec-target-leakage-check Specification

## Purpose

This capability ensures that `mlspec-run` skill requires evidence of target-leakage/label-shift sanity checks before accepting training evidence. The dogfooding run showed near-zero loss with bad generation, which may indicate target-leakage, broken label shifting, degenerate data construction, or another training objective bug.

## ADDED Requirements

### Requirement: mlspec-run requires autoregressive shift evidence

The `mlspec-run` skill template SHALL require evidence that autoregressive training is correctly shifted.

#### Scenario: Label shift check required
- **WHEN** evidence is recorded for any training stage
- **THEN** the evidence Markdown body SHALL include one of:
  - `autoregressive_shift_verified: true` with verification method description
  - `autoregressive_shift_not_applicable: true` with reason

#### Scenario: Causal LM verification
- **WHEN** `autoregressive_shift_verified: true` is claimed
- **THEN** the evidence SHALL document the verification method used
- **AND** the verification SHALL confirm:
  - Logits are computed for all positions 0 to seq_len-1
  - Loss is computed by comparing `logits[:, :-1, :]` against `input_ids[:, 1:]`
  - At position t, the model predicts token t+1, NOT token t
  - The model CANNOT attend to future tokens (causal mask is properly applied)

#### Scenario: Verification via code review
- **WHEN** verification is done by code review
- **THEN** the evidence SHALL cite:
  - The specific file and line where loss is computed
  - The slice used: `logits[:, :-1, :]` vs `logits[:, 1:, :]`
  - Confirmation that input_ids is shifted correctly

#### Scenario: Verification via unit test
- **WHEN** verification is done by a unit test
- **THEN** the evidence SHALL include:
  - Test name and location
  - The test verifies: with input_ids `[A, B, C, D]`, loss at position 0 is computed against token B, not A
  - Test output showing loss is non-zero on shifted targets

---

### Requirement: mlspec-run detects suspiciously low loss

The `mlspec-run` skill template SHALL flag suspiciously low loss values.

#### Scenario: Near-zero loss warning
- **WHEN** training loss drops below 0.01
- **THEN** the skill SHALL output warning: "Near-zero loss detected. Verify autoregressive shift is correct."
- **AND** the evidence SHALL include `loss_sanity_note` explaining why loss is reasonable

---

### Requirement: mlspec-run requires loss-generation consistency

The `mlspec-run` skill template SHALL require that generation quality matches loss values.

#### Scenario: Loss-gen mismatch requires investigation
- **WHEN** loss is near-zero AND generation collapse metrics (repetition_rate > 0.5, distinct-1 < 0.1) indicate bad generation
- **THEN** the skill SHALL stop and output: "SANITY CHECK FAILED: Near-zero loss with bad generation indicates possible target-leakage"
- **AND** the skill SHALL require an investigation note before writing/accepting evidence

#### Scenario: Investigation override
- **WHEN** user provides investigation note explaining the anomaly
- **THEN** the skill MAY continue and record evidence with `sanity_override: true` and the investigation note