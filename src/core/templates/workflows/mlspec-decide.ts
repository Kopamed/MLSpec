/**
 * MLSpec Decide Skill Template
 *
 * Template module for MLSpec decide skill and command.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getMlspecDecideSkillTemplate(): SkillTemplate {
  return {
    name: 'mlspec-decide',
    description: 'Interpret evidence and write a decision for an MLSpec experiment. Use when the user wants to make a decision (promote/reject/inconclusive/hold/retry) based on accumulated evidence.',
    instructions: `Interpret evidence and write a decision for an MLSpec experiment.

This skill reads all evidence files, compares against success/abort criteria, and writes \`decision.md\`. **Does not promote or archive.**

---

**Input**: Experiment name and decision type.

Required:
- Experiment name (e.g., \`roi-cropping\`)
- Decision: \`promote\`, \`reject\`, \`inconclusive\`, \`hold\`, or \`retry\`

Optional:
- Target candidate (required if decision is \`promote\`)

Examples:
\`\`\`
mlspec-decide roi-cropping --decision promote --target-candidate resnet-v2
mlspec-decide cutmix --decision reject
\`\`\`

---

**Steps**

1. **Validate prerequisites**
   - Confirm MLSpec workspace exists
   - Confirm experiment exists
   - Check that at least one evidence file exists
   - Read hypothesis to understand success/abort criteria

2. **Read all evidence files**
   - Read \`experiments/<name>/evidence/E1.md\`, E2.md, etc.
   - Extract metrics, commands, artifacts
   - Note what each evidence level proves

3. **Analyze evidence against criteria**
   For each evidence level:
   - Compare metrics against success criteria
   - Compare metrics against abort criteria
   - Note stability across seeds/folds if applicable
   - Distinguish what the evidence **proves** vs what it **does not prove**

4. **Distinguish proving vs not proving**
   Structure the analysis as:
   - **Evidence supports**: What the results demonstrate
   - **Evidence does not support**: What remains unproven or is contradicted
   - **Unknowns**: What the experiment cannot tell us

5. **Create decision**
   \`\`\`bash
   mlspec decide <experiment> --decision <type> [--target-candidate <name>]
   \`\`\`
   This creates \`experiments/<name>/decision.md\`

6. **Fill decision.md**
   - **Evidence Considered**: List all evidence files
   - **What This Decision Proves**: Positive findings with evidence
   - **What This Decision Does Not Prove**: Limitations and negative findings
   - **Reasoning**: Why this decision was made

   For each decision type:
   - **promote**: Note target candidate, what is proven
   - **reject**: Note rejection reason, what was ruled out
   - **inconclusive**: Note uncertainty, what more evidence is needed
   - **hold**: Note blocker, conditions for revisit
   - **retry**: Note retry plan, what will change

7. **Validate decision**
   \`\`\`bash
   mlspec validate
   \`\`\`
   Fix any errors (e.g., placeholder values in decision fields).

---

**Output**

\`\`\`
## Decision: <experiment>

**Decision**: <promote|reject|inconclusive|hold|retry>

### Evidence Summary
| Level | Key Metrics | Interpretation |
|-------|-------------|----------------|
| E1 | ... | ... |
| E2 | ... | ... |

### What This Proves
<Positive findings>

### What This Does Not Prove
<Limitations, negative findings>

### Next Steps
1. Promote experiment (mlspec-promote) — if promote decision
2. Archive experiment (mlspec-archive) — if reject/inconclusive/hold
3. Re-run evidence (mlspec-run-evidence) — if retry
4. Investigate further (mlspec-explore) — if inconclusive

What would you like to do?
\`\`\`

**Guardrails**
- **DO NOT** promote the experiment
- **DO NOT** archive the experiment
- **DO NOT** make a decision without sufficient evidence
- **DO** read all evidence files before deciding
- **DO** compare evidence against success and abort criteria
- **DO** distinguish what evidence proves vs does not prove
- **DO** fill all decision fields (do not leave placeholders)
- **DO** validate decision.md after creation
- **DO** recommend next actions based on decision type`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI and MLSpec workspace',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getMlspecDecideCommandTemplate(): CommandTemplate {
  return {
    name: 'MLSpec: Decide',
    description: 'Interpret evidence and write a decision for an MLSpec experiment. Use when the user wants to make a decision (promote/reject/inconclusive/hold/retry) based on accumulated evidence.',
    category: 'Workflow',
    tags: ['workflow', 'mlspec', 'ml', 'experiment', 'decision'],
    content: `Interpret evidence and write a decision for an MLSpec experiment.

This skill reads all evidence files, compares against success/abort criteria, and writes \`decision.md\`. **Does not promote or archive.**

---

**Input**: Experiment name and decision type.

Required:
- Experiment name (e.g., \`roi-cropping\`)
- Decision: \`promote\`, \`reject\`, \`inconclusive\`, \`hold\`, or \`retry\`

Optional:
- Target candidate (required if decision is \`promote\`)

Examples:
\`\`\`
mlspec-decide roi-cropping --decision promote --target-candidate resnet-v2
mlspec-decide cutmix --decision reject
\`\`\`

---

**Steps**

1. **Validate prerequisites**
   - Confirm MLSpec workspace exists
   - Confirm experiment exists
   - Check that at least one evidence file exists
   - Read hypothesis to understand success/abort criteria

2. **Read all evidence files**
   - Read \`experiments/<name>/evidence/E1.md\`, E2.md, etc.
   - Extract metrics, commands, artifacts
   - Note what each evidence level proves

3. **Analyze evidence against criteria**
   For each evidence level:
   - Compare metrics against success criteria
   - Compare metrics against abort criteria
   - Note stability across seeds/folds if applicable
   - Distinguish what the evidence **proves** vs what it **does not prove**

4. **Distinguish proving vs not proving**
   Structure the analysis as:
   - **Evidence supports**: What the results demonstrate
   - **Evidence does not support**: What remains unproven or is contradicted
   - **Unknowns**: What the experiment cannot tell us

5. **Create decision**
   \`\`\`bash
   mlspec decide <experiment> --decision <type> [--target-candidate <name>]
   \`\`\`
   This creates \`experiments/<name>/decision.md\`

6. **Fill decision.md**
   - **Evidence Considered**: List all evidence files
   - **What This Decision Proves**: Positive findings with evidence
   - **What This Decision Does Not Prove**: Limitations and negative findings
   - **Reasoning**: Why this decision was made

   For each decision type:
   - **promote**: Note target candidate, what is proven
   - **reject**: Note rejection reason, what was ruled out
   - **inconclusive**: Note uncertainty, what more evidence is needed
   - **hold**: Note blocker, conditions for revisit
   - **retry**: Note retry plan, what will change

7. **Validate decision**
   \`\`\`bash
   mlspec validate
   \`\`\`
   Fix any errors (e.g., placeholder values in decision fields).

---

**Output**

\`\`\`
## Decision: <experiment>

**Decision**: <promote|reject|inconclusive|hold|retry>

### Evidence Summary
| Level | Key Metrics | Interpretation |
|-------|-------------|----------------|
| E1 | ... | ... |
| E2 | ... | ... |

### What This Proves
<Positive findings>

### What This Does Not Prove
<Limitations, negative findings>

### Next Steps
1. Promote experiment (mlspec-promote) — if promote decision
2. Archive experiment (mlspec-archive) — if reject/inconclusive/hold
3. Re-run evidence (mlspec-run-evidence) — if retry
4. Investigate further (mlspec-explore) — if inconclusive

What would you like to do?
\`\`\`

**Guardrails**
- **DO NOT** promote the experiment
- **DO NOT** archive the experiment
- **DO NOT** make a decision without sufficient evidence
- **DO** read all evidence files before deciding
- **DO** compare evidence against success and abort criteria
- **DO** distinguish what evidence proves vs does not prove
- **DO** fill all decision fields (do not leave placeholders)
- **DO** validate decision.md after creation
- **DO** recommend next actions based on decision type`,
  };
}