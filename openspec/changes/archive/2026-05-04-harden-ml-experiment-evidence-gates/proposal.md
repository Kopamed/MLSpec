## Why

The ml-experiment schema dogfood revealed critical template weaknesses: evidence and resolution artifacts can be marked complete with smoke or partial evidence, resolution can claim Accepted/Rejected without decision-grade evidence, and prepare.md checkboxes can be "washed" without actual verification. These gaps allow invalid experiment conclusions to appear legitimate.

## What Changes

- Add `Experiment Type` classification to `experiment.md` template with required fields
- Restructure `prepare.md` into explicit phases: Infrastructure, Tiny/Smoke Run, Protocol Run, Run Readiness, Logging
- Require `prepare.md` tasks to include file paths, verification commands, expected outputs, and completion conditions
- Expand `evidence.md` with Run Identity, Run Records, Commands Run, Configs Used, Metrics Observed, Evidence Grade, Protocol Satisfaction, Protocol Deviations, Claims Invalidated, Implementation Issues, Validity Assessment, Artifacts Produced, Samples
- Expand `resolution.md` with Decision-Grade Evidence, Decision, Basis, Protocol Compliance, Evidence Summary, Cost, Next Action
- Update `schema.yaml` instructions to enforce evidence grade gates: Smoke/Partial evidence cannot support Accepted/Rejected; Failed evidence must resolve to Invalid or Needs-Rerun

## Capabilities

### New Capabilities
- `ml-experiment-harden`: Hardened ml-experiment schema templates that enforce evidence quality gates through template structure and explicit instructions

### Modified Capabilities
- `ml-experiment-workflow`: Updated evidence.md and resolution.md template structure and schema instructions (no spec-level behavior change, template hardening only)

## Impact

Modified files:
- `schemas/ml-experiment/schema.yaml` — updated evidence and resolution instructions
- `schemas/ml-experiment/templates/experiment.md` — added Experiment Type field
- `schemas/ml-experiment/templates/prepare.md` — restructured with phases and verification requirements
- `schemas/ml-experiment/templates/evidence.md` — expanded sections and evidence grade field
- `schemas/ml-experiment/templates/resolution.md` — expanded sections and decision-grade evidence field

No code changes. No new CLI commands. No database or tracker changes.
