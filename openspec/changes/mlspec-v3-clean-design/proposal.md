# Proposal: MLSpec V3 Clean Design

## Why

MLSpec V2's evidence stages (smoke/validation/final) conflate engineering readiness checks with empirical evidence collection. "Smoke" means "does it run?" - an engineering concern that belongs in a Prepare stage, not evidence. Evidence rungs should measure empirical model effects, not preprocessing correctness. Additionally, V2 resolution cannot represent partial success where a mechanistic hypothesis fails but practical utility improves. V3 provides a clean, scientifically rigorous experiment protocol.

## What Changes

**BREAKING** - New experiment protocol replacing V2 entirely:

1. **protocol.md (NEW, REQUIRED)** - Frozen experiment protocol defining evidence ladder, compute agreement, and per-rung baseline requirements
2. **prepare.md (NEW, REQUIRED)** - Engineering readiness verification before evidence collection
3. **Evidence ladder (NEW)** - User-defined rungs replace hard-coded smoke/validation/final
4. **Rung-based evidence** - `evidence/<rung-id>.md` replaces `evidence/<stage>.md`
5. **Baseline/treatment arms** - Each evidence rung explicitly trains and compares baseline_arm vs treatment_arm
6. **Per-rung baselines** - Baseline model may differ per rung based on budget class
7. **Separated resolution outcomes** - mechanistic_outcome and practical_outcome replace single resolution field
8. **Remove EvidenceStageSchema** - No more hard-coded smoke/validation/final anywhere

## Architecture: CLI vs Skills

### CLI (TypeScript Binary)

The MLSpec CLI is a **validation and state management tool**. It does NOT perform ML work.

**Responsibilities:**
- Schema validation (protocol.md, prepare.md, evidence/<rung>.md, resolution.md)
- State machine enforcement (draft → running → resolved)
- Artifact path validation (`evidence/<rung>.md` for rung in ladder)
- Gating enforcement (prepare.md status=ready before evidence; can_resolve=true before resolution)
- Workspace structure validation
- Command registration and orchestration

**CLI Commands:**
- `mlspec prepare <experiment>` - Validates prepare.md exists and schema-valid; returns exit code based on status
- `mlspec run <experiment> <rung>` - Validates rung exists in protocol and gates satisfied
- `mlspec resolve <experiment>` - Validates can_resolve=true rung has evidence and gates satisfied
- `mlspec validate` - Validates workspace structure and artifact schemas
- `mlspec status` - Shows experiment state and ladder progress

### Skills (Agent Prompts)

MLSpec skills are **agent prompts/templates** installed to `.opencode/skills/`. Agents read skills to understand what to do. The CLI does not invoke skills.

**Skills perform project-specific work:**
- Transform implementation and correctness verification
- Benchmark script implementation
- Training startup checks (≤100 steps)
- Baseline model training (when required by rung)
- Treatment model training
- Benchmark execution
- Metrics collection
- Evidence file filling
- Outcome assessment (mechanistic/practical)

**V3 Skill Inventory:**
- `/mlspec-explore` - Explore workspace, suggest experiment directions
- `/mlspec-propose` - Create experiment with protocol.md
- `/mlspec-prepare` - Perform readiness checks, write prepare.md
- `/mlspec-run` - Perform evidence collection, write evidence/<rung>.md
- `/mlspec-resolve` - Assess outcomes, write resolution.md
- `/mlspec-next` - Recommend next action based on state

## Capabilities

### New Capabilities

- `mlspec-protocol-artifacts`: protocol.md and prepare.md artifact schemas and CLI validation
- `mlspec-evidence-ladder`: User-defined evidence rungs with per-rung baselines and arms
- `mlspec-rung-based-run`: Rung-based evidence collection replacing stage-based flow
- `mlspec-prepare-stage`: Prepare skill performs engineering readiness before evidence
- `mlspec-separated-resolution`: Mechanistic vs practical outcome resolution

### Modified Capabilities

- `mlspec-workflow-skills`: Update skill templates for V3 lifecycle (Prepare stage, rung-based evidence, separated resolution). Skills are agent prompts that perform work and write artifacts; CLI validates schemas, states, and gates.

## Impact

**Files Changed:**
- `src/mlspec/entity-types.ts` - Schema redesign (protocol, prepare, rung evidence, resolution)
- `src/mlspec/cli/index.ts` - Command redesign (remove add-evidence, accept/reject/etc)
- `src/mlspec/reference-resolver.ts` - Protocol/prepare loading functions
- `src/mlspec/protocol.ts` - AGENTS.md rewrite for V3
- `src/core/templates/workflows/*.ts` - V3 skill template redesign

**Files Created:**
- `src/mlspec/cli/mlspec-prepare.ts` - prepare command (validates prepare.md)
- `src/core/templates/workflows/mlspec-prepare.ts` - Prepare skill template

**Files Removed:**
- EvidenceStageSchema (replaced by user-defined rung IDs)
- add-evidence command (replaced by agent writing evidence/<rung>.md)
- accept/reject/retry/hold/inconclusive commands (replaced by resolve)
