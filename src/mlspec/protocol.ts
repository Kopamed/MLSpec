/**
 * MLSpec Agent Experiment Protocol
 *
 * This file contains the AGENTS.md content that is created by `openspec ml init`
 * and documents the agent experiment protocol for MLSpec.
 */

export const AGENTS_CONTENT = `# MLSpec Agent Experiment Protocol

This document describes the protocol for AI coding agents running ML experiments through MLSpec.

## Before Running

1. **Read this protocol** before starting ML experiments in this workspace.

2. **Create or review hypothesis.md** for the experiment:
   - State the hypothesis clearly
   - Define the comparison reference (baseline or candidate)
   - List controlled variables (what stays fixed)
   - Define success criteria (metric thresholds)
   - Define abort criteria (when to stop early)
   - Plan evidence level progression (E1 → E2 → E3 → E4 → E5)

3. **Record the planned command** and expected output location.

## During Running

4. **Execute the planned command** — don't change anything except what's being tested.

5. **Log the actual command** that was executed (may differ from planned).

6. **Save outputs** to the expected location or record where they were saved.

## After Running

7. **Create evidence file** using \`openspec ml add-evidence <experiment> --level E1\`:
   - Record actual_command (the exact command run)
   - Record changed_files (what you actually modified)
   - Record metrics with actual numbers
   - Interpret: is there a signal?
   - Recommend: promote/reject/retry/inconclusive/hold

8. **Make a decision** using \`openspec ml decide <experiment> --decision <decision>\`:
   - Base on evidence, not intuition
   - State reasoning explicitly
   - If promote: specify target candidate

9. **Promote if warranted** using \`openspec ml promote <experiment> --to <candidate>\`.

10. **Archive completed experiments** using \`openspec ml archive <experiment>\`.

## Evidence Levels

- **E1**: Cheap proxy (1 seed, minimal compute) — is there any signal?
- **E2**: Controlled (3+ seeds, full data) — is the signal real?
- **E3**: Realistic scale validation — does it transfer?
- **E4**: Full cross-validation — is it robust?
- **E5**: Final production validation — ready to ship?

## Controlled Variables

Always document what stays fixed during an experiment:
- Model / architecture
- Dataset split or sampling strategy
- Preprocessing / input representation
- Optimizer and learning-rate schedule
- Batch size / accumulation
- Seed(s)
- Training budget / epochs / steps / tokens
- Evaluation procedure
- Domain-specific variables (e.g., image size for vision)

## Output Conventions

Recommended path structure for local outputs:

\`\`\`
outputs/
└── <experiment-name>/
    └── <evidence-level>/
        ├── command.txt      # Actual command executed
        ├── metrics.json     # Numeric metrics
        ├── train.log        # Training logs
        ├── predictions.csv  # Predictions on test set
        ├── checkpoint.pt    # Model checkpoint
        └── diff.patch       # Changes made to codebase
\`\`\`

Agents using W&B, MLflow, or cloud training can reference those paths in the evidence \`artifacts\` field instead.

## Validation

Run \`openspec ml validate\` to check for issues:

- **Errors**: Structural problems (missing files, broken YAML, evidence without hypothesis)
- **Warnings**: Protocol issues (missing actual_command, placeholder values, thin evidence for promote)

## Key Rules

1. Do not run vague experiments directly — create hypothesis first.
2. Change one thing at a time — document controlled variables.
3. Record actual_command, not just planned_command.
4. Use real metrics, not placeholder values like \`_auc_delta: _\`.
5. Do not promote from E1 without warning (thin evidence).
6. Do not combine tricks without a combination experiment.
`;
