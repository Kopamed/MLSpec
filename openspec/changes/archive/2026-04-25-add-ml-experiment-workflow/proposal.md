## Why

OpenSpec currently provides a spec-driven development workflow for software changes (`proposal → specs → design → tasks → implementation → archive`), but it has no equivalent for ML experimentation. Teams running ML experiments today lack a structured way to:

- Formally state hypotheses before running experiments
- Track evidence at different proxy levels (E1 cheap smoke test → E5 full validation)
- Make explicit promote/reject/inconclusive decisions based on evidence
- Maintain versioned candidate recipes without silent mutation
- Synthesize findings across experiments into institutional knowledge

This creates a common failure mode: tiny experiments look promising, tricks get combined without proper testing, and the final submission is built on a foundation of proxies that don't transfer to reality.

## What Changes

This change adds **MLSpec** — an ML-specific, repo-native, evidence-driven experimentation workflow — to the OpenSpec package. It provides:

- A new `mlspec/` workspace directory structure (distinct from `openspec/` for software)
- A new `ml-experiment` schema defining MLSpec artifact types
- A new `openspec ml` CLI subcommand with experiment lifecycle commands
- Evidence-level-aware validation and status reporting
- Integration with the existing OpenSpec core (schema engine, templates, archive mechanics) where applicable, with clear separation where not

## Capabilities

### New Capabilities

- **ml-experiment workflow**: A new workflow schema (`ml-experiment`) defining artifacts for hypothesis, evidence, and decision tracking
- **mlspec workspace**: A new `mlspec/` directory structure for ML projects with baselines/, experiments/, candidates/, findings/, and archive/ subdirectories
- **ML CLI commands**: `openspec ml init`, `openspec ml new baseline <name>`, `openspec ml new candidate <name>`, `openspec ml new experiment <name>`, `openspec ml add evidence`, `openspec ml decide`, `openspec ml promote`, `openspec ml archive`, `openspec ml status`, `openspec ml validate`
- **Evidence-level validation**: Validation rules that distinguish structural errors (invalid YAML, broken references) from suspicious ML patterns (E2 worse than E1, thin evidence for promotion)
- **Versioned candidate recipes**: Candidate recipes track version history with draft/finalized status, preventing silent mutation
- **Findings knowledge base**: A `findings/` directory for synthesized experiment knowledge, present from MVP but manually maintained

### Modified Capabilities

_None — MLSpec is additive and does not modify existing OpenSpec behavior._

## Impact

### New Files and Directories

- `schemas/ml-experiment/schema.yaml` — Schema defining MLSpec artifact types and dependencies
- `schemas/ml-experiment/templates/` — Templates for hypothesis.md, evidence.md, decision.md, baseline.md, recipe.md, finding.md
- `src/mlspec/` — New MLSpec implementation directory
  - `src/mlspec/cli.ts` — CLI subcommand registration
  - `src/mlspec/init.ts` — MLSpec workspace initialization
  - `src/mlspec/entity-types.ts` — Entity type definitions (experiment, baseline, candidate, finding)
  - `src/mlspec/reference-resolver.ts` — Cross-entity reference validation
  - `src/mlspec/commands/` — MLSpec command implementations

### Core Refactoring

### Core Refactoring

- `src/core/artifact-graph/resolver.ts` — Add workspace path parameter to support `mlspec/` alongside `openspec/`
- `src/core/project-config.ts` — Add workspace path parameter for config discovery

### Non-Impact

- Existing `openspec/` workspace behavior is unchanged
- Existing CLI commands remain functional
- Archive mechanics are reused conceptually but not the delta-spec merge behavior

## MVP Non-Goals (Out of Scope)

The following are explicitly **not** built in MVP:

- W&B/MLflow/DVC integration or raw run ingestion
- Automatic training script generation or execution
- Statistical significance testing or automated decision-making
- Dashboard or metric visualization
- Automatic YAML config patching from promotion
- Automatic findings synthesis
- Multi-study hierarchical organization
- Separate `mlspec` binary (delivered as `openspec ml` subcommand)
