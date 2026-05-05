## Why

OpenSpec currently supports software change workflows (proposal → specs → design → tasks) but lacks a workflow for machine learning experimentation. MLSpec enables structured ML experiments within OpenSpec's artifact-driven workflow, bringing scientific rigor to ML development without introducing a separate CLI, database, or state machine.

## What Changes

- Add a new built-in schema `ml-experiment` to `schemas/ml-experiment/`
- Create 5 artifact templates: experiment.md, protocol.md, prepare.md, evidence.md, resolution.md
- Define artifact dependency graph: experiment → protocol → prepare → evidence → resolution
- Configure apply phase to track progress via prepare.md checkboxes

## Capabilities

### New Capabilities
- `ml-experiment-workflow`: A schema-only ML experimentation workflow that structures hypothesis → protocol → preparation → evidence → resolution using OpenSpec's existing artifact graph, schema loader, status command, and instructions machinery.

## Impact

- New built-in schema: `schemas/ml-experiment/schema.yaml`
- New templates: `schemas/ml-experiment/templates/{experiment,protocol,prepare,evidence,resolution}.md`
- No modifications to existing CLI commands, skills, or core architecture
- No new dependencies or breaking changes
