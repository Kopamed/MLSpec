/**
 * MLSpec V2 Agent Experiment Protocol
 *
 * This file contains the AGENTS.md content that is created by `mlspec init`
 * and documents the agent experiment protocol for MLSpec V2.
 */

export const AGENTS_CONTENT = `# MLSpec V2 Agent Experiment Protocol

This document describes the protocol for AI coding agents running ML experiments through MLSpec V2.

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

### Evidence Stages
Evidence is recorded at semantic stages, not arbitrary levels:
- **smoke**: Cheap signal check — does it run? Is there positive/negative signal?
- **validation**: Trusted local evaluation — does it beat the base recipe?
- **final**: External/submission/production result

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
- Evidence plan (smoke → validation → final)

### 3. Run
Record evidence at each stage:
\`\`\`bash
/mlspec-run <experiment> <stage>
\`\`\`
- Stage is inferred if not specified
- Records runs, metrics, and recommendations

### 4. Resolve
Resolve the experiment based on evidence:
\`\`\`bash
/mlspec-resolve <experiment>
\`\`\`
Resolution types:
- **accept**: Creates new recipe node
- **reject**: End experiment, no recipe
- **retry**: Return to running with modifications
- **hold**: Pause for later
- **inconclusive**: Evidence neither supports nor refutes

### 5. Next
Get recommended next action:
\`\`\`bash
/mlspec-next
\`\`\`
This is read-only and never modifies files.

## Acceptance Warning Matrix

When accepting an experiment, warnings are shown based on evidence stage vs target tag:

| Evidence Stage | → candidate | → current-best |
|----------------|-------------|----------------|
| smoke | Warning | Strong warning |
| validation | OK | Normal |
| final | OK | Strongest support |

## Controlled Variables

Always document what stays fixed:
- Model architecture
- Data split or sampling strategy
- Preprocessing / input representation
- Optimizer and learning-rate schedule
- Batch size / accumulation
- Seed(s)
- Training budget / epochs / steps / tokens
- Evaluation procedure

## Output Conventions

Recommended path structure:
\`\`\`
outputs/
└── <experiment-name>/
    └── <stage>/
        ├── command.txt
        ├── metrics.json
        ├── train.log
        ├── predictions.csv
        ├── checkpoint.pt
        └── diff.patch
\`\`\`

## Validation

Run \`mlspec validate\` to check for:
- **Errors**: Structural problems (missing files, broken YAML)
- **Warnings**: Protocol issues (missing evidence, thin evidence for current-best)

## Key Rules

1. Do not run vague experiments — create hypothesis first
2. Change one thing at a time — document controlled variables
3. Use real metrics, not placeholder values
4. Do not accept from smoke as current-best without warning
5. Skills infer context — CLI stays explicit
`;