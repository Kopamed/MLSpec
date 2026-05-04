/**
 * MLSpec V3 Agent Experiment Protocol
 *
 * This file contains the AGENTS.md content that is created by `mlspec init`
 * and documents the agent experiment protocol for MLSpec V3.
 */

export const AGENTS_CONTENT = `# MLSpec V3 Agent Experiment Protocol

This document describes the protocol for AI coding agents running ML experiments through MLSpec V3.

## Core Concepts

### Recipe
A recipe is a complete, runnable ML pipeline. Recipes form a graph via parent links:
- **baseline**: Original recipe, never superseded OR historical reference
- **candidate**: Has supporting experiments but not designated current-best
- **current-best**: User-designated best performing recipe for the task
- **variant**: Alternative approach (e.g., fast inference, small model)
- **archived**: No longer actively considered

### Experiment
An experiment proposes a change to a recipe. It has:
- **base_recipe**: The recipe being modified
- **proposed_recipe**: The new recipe ID if accepted
- **proposed_change**: What is being changed

### Evidence Ladder
Evidence is collected at user-defined rungs (not fixed stages):
- Rungs are defined in protocol.md's evidence_ladder
- Each rung has a purpose and can_resolve flag
- Agents collect evidence at each rung using /mlspec-run skill

## Workflow

### 1. Explore
Before creating experiments, understand the workspace:
\`\`\`bash
/mlspec-explore
\`\`\`
This inspects recipes, experiments, evidence, and findings to identify opportunities.

### 2. Propose
Create an experiment with full hypothesis:
\`\`\`bash
/mlspec-propose <experiment-id> --from <base-recipe> --proposes <proposed-recipe>
\`\`\`
Define:
- Controlled variables (what stays fixed)
- Success criteria (metric thresholds for acceptance)
- Abort criteria (when to stop early)

### 3. Prepare
Prepare the experiment before collecting evidence:
\`\`\`bash
/mlspec-prepare <experiment-id>
\`\`\`
- Validates engineering readiness
- Checks dependencies, data availability, compute resources
- Creates prepare.md with status (ready/needs_work/protocol_change_required)

### 4. Run
Collect evidence at each rung:
\`\`\`bash
/mlspec-run <experiment-id> <rung-id>
\`\`\`
- Validates preflight (protocol.md exists, prepare.md status=ready, rung in ladder)
- The /mlspec-run skill writes evidence/<rung-id>.md with results

### 5. Resolve
Resolve the experiment based on evidence at can_resolve rung:
\`\`\`bash
/mlspec-resolve <experiment-id>
\`\`\`
- Validates preflight (evidence exists for can_resolve rung, no existing resolution.md)
- The /mlspec-resolve skill writes resolution.md with mechanistic_outcome and practical_outcome

Resolution types:
- **accept**: Creates new recipe node
- **reject**: End experiment, no recipe
- **retry**: Return to running with modifications
- **hold**: Pause for later

### 6. Next
Get recommended next action:
\`\`\`bash
/mlspec-next <experiment-id>
\`\`\`
This is read-only and never modifies files.

## Key Rules

1. Do not run vague experiments — create hypothesis first
2. Change one thing at a time — document controlled variables
3. Use real metrics, not placeholder values
4. CLI validates state; skills write artifacts
5. Skills infer context — CLI stays explicit
`;
