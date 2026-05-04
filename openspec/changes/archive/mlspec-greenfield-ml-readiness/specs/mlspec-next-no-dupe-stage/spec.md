# mlspec-next-no-dupe-stage Specification

## Purpose

This capability fixes the bug where `mlspec next --json` recommends adding evidence for a stage that already exists.

## ADDED Requirements

### Requirement: mlspec next --json checks existing evidence

When `mlspec next --json` scans a running experiment `<id>`, it SHALL check for existing evidence files before recommending next actions.

#### Scenario: No recommendation for existing stage
- **WHEN** `mlspec next --json` scans experiment `<id>`
- **AND** evidence file exists at `mlspec/experiments/<id>/evidence/smoke.md`
- **THEN** the JSON output SHALL NOT include `run smoke` in the actions list
- **AND** if evidence file exists at `mlspec/experiments/<id>/evidence/validation.md`
- **THEN** the JSON output SHALL NOT include `run validation` in the actions list

#### Scenario: Existing stages included in response
- **WHEN** `mlspec next --json` scans experiment `<id>`
- **THEN** the JSON output SHALL include `existing_stages: ["smoke", "validation"]` or similar
- **AND** only missing stages SHALL appear in the actions list

---

### Requirement: mlspec next --json uses correct evidence path

When `mlspec next --json` scans a running experiment `<id>`, it SHALL check evidence at `mlspec/experiments/<id>/evidence/{smoke,validation,final}.md`.

#### Scenario: Correct path checking
- **WHEN** `mlspec next --json` checks for smoke evidence
- **THEN** it SHALL check if `mlspec/experiments/<id>/evidence/smoke.md` exists
- **WHEN** checking for validation evidence
- **THEN** it SHALL check if `mlspec/experiments/<id>/evidence/validation.md` exists
- **WHEN** checking for final evidence
- **THEN** it SHALL check if `mlspec/experiments/<id>/evidence/final.md` exists

#### Scenario: NOT using wrong paths
- **WHEN** checking for evidence
- **THEN** the command SHALL NOT check `.mlspec/evidence/` or similar paths