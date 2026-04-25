## Why

MLSpec currently provides the data model and CLI for ML experiments but lacks a behavioral protocol that ensures AI coding agents use it with discipline. Without an explicit protocol, agents can run vague experiments, skip hypothesis documentation, record placeholder values, and make promote/reject decisions without rigorous evidence. This change adds the agent-facing layer—the protocol that makes MLSpec more than a file structure.

## What Changes

- **`openspec ml init`** creates `mlspec/AGENTS.md` with the full agent experiment protocol
- **Enhanced hypothesis.md template** with explicit fields for controlled variables, success criteria, abort criteria, and evidence level plan
- **Enhanced evidence.md template** with explicit sections for actual_command, changed_files, interpretation, and recommendation
- **Enhanced decision.md template** with explicit reasoning and what/doesn't prove structure
- **Validation warning** when evidence file lacks actual command recorded (not a hard error—evidence may be reconstructed or imported)
- **Validation warning** when evidence lacks artifact paths (local outputs, W&B references, etc.)
- **Validation warning** for placeholder values in metrics and decision fields
- **Validation error** when evidence exists but hypothesis.md is missing (broken state)
- **Status improvements** showing protocol state: `needs hypothesis`, `needs evidence`, `needs decision`, `needs promotion`, `needs archive`

## Capabilities

### New Capabilities

- **`mlspec-agent-protocol`**: Defines the agent experiment protocol for MLSpec—rules for running disciplined ML experiments through AI coding agents. Covers before/during/after workflow, controlled variables, evidence level progression, output conventions, and validation expectations.

### Modified Capabilities

- **`ml-experiment-workflow`**: MLSpec CLI and workspace (implemented in `add-ml-experiment-workflow`). Being modified to:
  - Create AGENTS.md on `ml init`
  - Provide enhanced templates with explicit structured fields
  - Validate agent-protocol compliance (warnings for missing commands/artifacts, errors for broken hypothesis-evidence linkage)
  - Report protocol state in status output

## Impact

- **New file**: `src/mlspec/protocol.ts` — AGENTS.md content and protocol rules
- **Modified**: `src/mlspec/cli.ts` — Enhanced templates, validation warnings, status improvements
- **No new CLI commands** — Uses existing `init`, `status`, `validate`
- **No breaking changes** — All new checks are warnings or error-level catches for broken states
- **Backward compatible** — Existing mlspec workspaces remain valid (warnings only, no forced migration)