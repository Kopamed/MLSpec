/**
 * MLSpec Run Evidence Skill Template
 *
 * Template module for MLSpec run-evidence skill and command.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getMlspecRunEvidenceSkillTemplate(): SkillTemplate {
  return {
    name: 'mlspec-run-evidence',
    description: 'Run one evidence level for an existing MLSpec experiment. Use when the user wants to execute training and record evidence for an experiment.',
    instructions: `Run one evidence level for an existing MLSpec experiment.

This skill executes the planned training command for a specific evidence level (E1-E5), saves outputs, and records evidence. **Does not make decisions or promote.**

---

**Input**: Experiment name and evidence level.

Required:
- Experiment name (e.g., \`roi-cropping\`)
- Evidence level: E1, E2, E3, E4, or E5

Examples:
\`\`\`
mlspec-run-evidence roi-cropping --level E1
mlspec-run-evidence cutmix --level E2
\`\`\`

---

**Steps**

1. **Validate prerequisites**
   - Confirm MLSpec workspace exists
   - Confirm experiment exists: \`mlspec status\`
   - Check that \`hypothesis.md\` exists and is filled
   - Check that evidence level does not already exist

2. **Read hypothesis for context**
   - Read \`experiments/<name>/hypothesis.md\`
   - Note intended change and controlled variables
   - Note planned command and expected output location
   - Note success/abort criteria

3. **Confirm with user**
   - Show intended change and controlled variables
   - Show planned command (or ask if missing)
   - Confirm this is the right experiment and level
   - Ask for confirmation before executing

4. **Create evidence scaffold**
   \`\`\`bash
   mlspec add-evidence <experiment> --level <level>
   \`\`\`
   This creates \`experiments/<name>/evidence/<level>.md\`

5. **Execute the planned command**
   - Execute the planned command after confirmation, or ask the user for the command if missing or unsafe
   - Capture output, logs, and metrics
   - Save outputs to \`outputs/<experiment>/<level>/\` for local workflow

6. **Record evidence**
   Edit the evidence file to record:
   - **What Was Done**: Experiment setup and execution
   - **Changed Files**: Files modified for this experiment
   - **Results**: Metrics table with comparison values
   - **Interpretation**: What the results mean
   - **Frontmatter**:
     - \`commands.planned\`: The planned command
     - \`commands.executed\`: The actual executed command
     - \`artifacts.metrics_file\`: Path to metrics output
     - \`artifacts.checkpoint\`: Path to model checkpoint
     - \`artifacts.predictions\`: Path to predictions
     - \`artifacts.log_file\`: Path to training log
     - \`artifacts.changed_files\`: List of modified files

7. **Validate evidence**
   \`\`\`bash
   mlspec validate
   \`\`\`
   Fix any errors.

8. **Recommend next action**
   - Suggest running next evidence level
   - Suggest running decision if evidence is sufficient
   - Ask what to do next

---

**Output**

\`\`\`
## Evidence Recorded: <experiment> (<level>)

### Execution Summary
- Command: <executed command>
- Output location: outputs/<experiment>/<level>/

### Results
| Metric | Comparison | This Experiment | Delta |
|--------|-----------|-----------------|-------|
| ... | | | |

### Recommendation
<From evidence file recommendation section>

### Next Steps
1. Run next evidence level (mlspec-run-evidence)
2. Make decision (mlspec-decide)
3. Explore other experiments (mlspec-explore)

What would you like to do?
\`\`\`

**Guardrails**
- **DO NOT** make a decision (promote/reject/inconclusive)
- **DO NOT** promote the experiment
- **DO NOT** archive the experiment
- **DO** require experiment name and evidence level
- **DO** read and confirm hypothesis before executing
- **DO** confirm intended change and controlled variables with user
- **DO** execute the planned command or ask if missing
- **DO** save outputs to recommended local path
- **DO** record commands.executed in evidence frontmatter
- **DO** validate after recording evidence
- **DO** stop after one evidence level; do not auto-continue`,
    license: 'MIT',
    compatibility: 'Requires openspec CLI and MLSpec workspace',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getMlspecRunEvidenceCommandTemplate(): CommandTemplate {
  return {
    name: 'MLSpec: Run Evidence',
    description: 'Run one evidence level for an existing MLSpec experiment. Use when the user wants to execute training and record evidence for an experiment.',
    category: 'Workflow',
    tags: ['workflow', 'mlspec', 'ml', 'experiment', 'evidence', 'training'],
    content: `Run one evidence level for an existing MLSpec experiment.

This skill executes the planned training command for a specific evidence level (E1-E5), saves outputs, and records evidence. **Does not make decisions or promote.**

---

**Input**: Experiment name and evidence level.

Required:
- Experiment name (e.g., \`roi-cropping\`)
- Evidence level: E1, E2, E3, E4, or E5

Examples:
\`\`\`
mlspec-run-evidence roi-cropping --level E1
mlspec-run-evidence cutmix --level E2
\`\`\`

---

**Steps**

1. **Validate prerequisites**
   - Confirm MLSpec workspace exists
   - Confirm experiment exists: \`mlspec status\`
   - Check that \`hypothesis.md\` exists and is filled
   - Check that evidence level does not already exist

2. **Read hypothesis for context**
   - Read \`experiments/<name>/hypothesis.md\`
   - Note intended change and controlled variables
   - Note planned command and expected output location
   - Note success/abort criteria

3. **Confirm with user**
   - Show intended change and controlled variables
   - Show planned command (or ask if missing)
   - Confirm this is the right experiment and level
   - Ask for confirmation before executing

4. **Create evidence scaffold**
   \`\`\`bash
   mlspec add-evidence <experiment> --level <level>
   \`\`\`
   This creates \`experiments/<name>/evidence/<level>.md\`

5. **Execute the planned command**
   - Execute the planned command after confirmation, or ask the user for the command if missing or unsafe
   - Capture output, logs, and metrics
   - Save outputs to \`outputs/<experiment>/<level>/\` for local workflow

6. **Record evidence**
   Edit the evidence file to record:
   - **What Was Done**: Experiment setup and execution
   - **Changed Files**: Files modified for this experiment
   - **Results**: Metrics table with comparison values
   - **Interpretation**: What the results mean
   - **Frontmatter**:
     - \`commands.planned\`: The planned command
     - \`commands.executed\`: The actual executed command
     - \`artifacts.metrics_file\`: Path to metrics output
     - \`artifacts.checkpoint\`: Path to model checkpoint
     - \`artifacts.predictions\`: Path to predictions
     - \`artifacts.log_file\`: Path to training log
     - \`artifacts.changed_files\`: List of modified files

7. **Validate evidence**
   \`\`\`bash
   mlspec validate
   \`\`\`
   Fix any errors.

8. **Recommend next action**
   - Suggest running next evidence level
   - Suggest running decision if evidence is sufficient
   - Ask what to do next

---

**Output**

\`\`\`
## Evidence Recorded: <experiment> (<level>)

### Execution Summary
- Command: <executed command>
- Output location: outputs/<experiment>/<level>/

### Results
| Metric | Comparison | This Experiment | Delta |
|--------|-----------|-----------------|-------|
| ... | | | |

### Recommendation
<From evidence file recommendation section>

### Next Steps
1. Run next evidence level (mlspec-run-evidence)
2. Make decision (mlspec-decide)
3. Explore other experiments (mlspec-explore)

What would you like to do?
\`\`\`

**Guardrails**
- **DO NOT** make a decision (promote/reject/inconclusive)
- **DO NOT** promote the experiment
- **DO NOT** archive the experiment
- **DO** require experiment name and evidence level
- **DO** read and confirm hypothesis before executing
- **DO** confirm intended change and controlled variables with user
- **DO** execute the planned command or ask if missing
- **DO** save outputs to recommended local path
- **DO** record commands.executed in evidence frontmatter
- **DO** validate after recording evidence
- **DO** stop after one evidence level; do not auto-continue`,
  };
}