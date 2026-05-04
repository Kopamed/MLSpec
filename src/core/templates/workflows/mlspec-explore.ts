/**
 * MLSpec Explore Skill Template
 *
 * Skill for thinking, inspecting, diagnosing, and proposing possible experiments.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getMlspecExploreSkillTemplate(): SkillTemplate {
  return {
    name: 'mlspec-explore',
    description: 'Explore ML experiment ideas, inspect recipes/experiments/evidence, reason about failure modes, and propose possible experiments. Use when you want to understand the current state of the ML workspace and identify promising directions.',
    instructions: `Explore ML experiment ideas and analyze the workspace.

This skill inspects the mlspec/ workspace to understand current recipes, experiments, evidence, and findings. It reasons about failure modes and proposes possible experiments.

---

**Pause if:**
- User requests file creation → "Explore mode is read-only. Use /mlspec-propose to create experiments."
- User requests training execution → "Explore mode is for analysis only. Use /mlspec-run to execute experiments."
- User asks to resolve/accept/reject → "Resolve decisions require evidence. Use /mlspec-resolve after evidence is recorded."

---

## Bootstrap: Empty Workspace Detection

**FIRST**: Run \`mlspec status --json\` to detect workspace state.

If the JSON output shows:
- \`recipes\` array is empty: The workspace is empty (bootstrap mode)
- \`current_best_recipes\`: Use to detect single vs multiple baselines

If \`mlspec status --json\` fails, fall back to file inspection:
- Check if \`mlspec/recipes/\` is empty (no recipe subdirectories exist).

If the workspace is empty:
1. Inspect project structure to understand what exists:
   - Training scripts (train.py, train.sh, etc.)
   - Config files (config.yaml, params.json, etc.)
   - Output directories
   - README or documentation
2. **Greenfield** (no scripts/configs found): Recommend a minimal starter baseline approach, suggest a recipe ID, note that no existing implementation was found
3. **Brownfield** (scripts/configs found): Identify the likely existing approach, infer a baseline recipe ID from project name or config
4. **Remain read-only** - do NOT create any files or run any mlspec CLI commands
5. Output format for empty workspace:

\`\`\`
## No Recipes Found

### Workspace Status
No baseline recipe exists yet. The MLSpec workspace is empty.

### Project Inspection
<Describe what was found in the project - scripts, configs, outputs, etc.>

### Bootstrap Recommendation
- **Approach**: <minimal starter or identified existing approach>
- **Suggested baseline ID**: <inferred from project name or config>
- **Notes**: <greenfield: "No existing ML implementation found" / brownfield: "Existing project detected">

Next: /mlspec-propose <baseline-id>
\`\`\`

If the workspace has recipes, continue with normal exploration below.

---

**Input**: Optional focus area or question from conversation.

---

**What to Inspect**

Prefer JSON CLI commands when available:

1. **Workspace Summary**
   - Run: \`mlspec status --json\` to get recipes and experiments overview
   - Use \`current_best_recipes\` to identify the current best recipe
   - Use \`experiments.by_status\` to see all experiments grouped by status

2. **Recipe Details**
   - Run: \`mlspec show recipe <id> --json\` for full recipe metadata
   - Includes tags, parent_recipe, config, metrics

3. **Evidence Details**
   - Run: \`mlspec show evidence <experiment> --json\` for evidence across all rungs
   - Includes runs, aggregate, comparison for each rung

4. **Experiments** (mlspec/experiments/*/experiment.yaml)
   - Status: draft, running, resolved
   - base_recipe and proposed_recipe
   - proposed_change description
   - prepare.md status (if exists)
   - Existing evidence rungs

5. **Findings** (mlspec/findings/*.md)
   - What works and what doesn't
   - Documented lessons from past experiments

6. **Code and Data** (optional)

If JSON commands fail, fall back to file inspection.
   - Inspect model code, preprocessing, training scripts
   - Understand data characteristics

---

**Analysis Steps**

1. **Understand Current Best**
   - Identify the current-best recipe
   - Note its metrics and configuration

2. **Review Active Experiments**
   - What's running? What's waiting for evidence?
   - Are any experiments stuck or showing negative results?

3. **Identify Opportunities**
   - What changes could improve current-best?
   - Are there failed experiments that teach us something?
   - What do findings suggest as promising directions?

4. **Consider Constraints**
   - Computational budget
   - Data availability
   - Timeline pressures

---

**Output Format**

\`\`\`
## Exploration Results

### Current Best Recipe
- **ID**: rf-mfcc-v1
- **Metrics**: accuracy=0.934, f1=0.921
- **Key characteristics**: RandomForest, MFCC features, 200 trees

### Active Experiments
1. add-eos-tokens (running) - pilot complete, validation in progress
2. tune-n-estimators (draft) - waiting to start

### Opportunities Identified
1. **EOS tokens**: Pilot shows +0.5% perplexity improvement - promising
2. **Feature selection**: Could reduce overfitting
3. **Ensemble**: Combine top 2 recipes

### Recommended Next Experiment
- **Base**: rf-mfcc-v1 (current-best)
- **Change**: Add ROI cropping before classification
- **Hypothesis**: ROI cropping will improve accuracy by >1%

Next: /mlspec-propose add-roi-cropping --from rf-mfcc-v1 --proposes rf-mfcc-roi-v1
\`\`\`

### Blocked: User Requests Modification

\`\`\`
## Explore Mode Blocked

Explore mode is read-only and cannot create experiments or run training.

**What you can do:**
1. /mlspec-propose <id> - create a new experiment
2. /mlspec-run <experiment> <rung> - run evidence collection for a rung
3. /mlspec-resolve <experiment> - resolve an experiment

What would you like to do?
\`\`\`

---

**Boundaries**

**Allowed:**
- Inspect recipes, experiments, evidence, findings
- Inspect data, code, artifacts
- Reason about failure modes
- Suggest possible experiments

**Forbidden:**
- Create experiment files
- Run training
- Resolve experiments
- In empty workspace: create any files or run any mlspec CLI commands

---

**Inference from Workspace**

When context is unclear, infer from:
- Current-best recipe tags
- Active experiments with incomplete evidence
- Most recent experiment or exploration output
- User's stated goals or concerns

When genuinely ambiguous, ask one focused question.
`,
    license: 'MIT',
    compatibility: 'Requires MLSpec v3 workspace with protocol.md',
    metadata: { author: 'mlspec', version: '3.0' },
  };
}

export function getMlspecExploreCommandTemplate(): CommandTemplate {
  return {
    name: 'MLSpec: Explore',
    description: 'Explore ML experiment ideas, inspect workspace, reason about failure modes, and propose possible experiments.',
    category: 'Workflow',
    tags: ['workflow', 'mlspec', 'ml', 'experiment', 'explore'],
    content: `Explore ML experiment ideas and analyze the workspace.

This skill inspects the mlspec/ workspace to understand current recipes, experiments, evidence, and findings. It reasons about failure modes and proposes possible experiments.

---

**Pause if:**
- User requests file creation → "Explore mode is read-only."
- User requests training → "Use /mlspec-run to execute experiments."
- User asks to resolve/accept/reject → "Use /mlspec-resolve after evidence is recorded."

---

**Input**: Optional focus area or question from conversation.

---

**What to Inspect**

Prefer JSON CLI commands when available:
- \`mlspec status --json\` for workspace overview
- \`mlspec show recipe <id> --json\` for recipe details
- \`mlspec show evidence <experiment> --json\` for evidence details

Fallback to file inspection if JSON commands fail.

1. **Recipes** (mlspec/recipes/*/recipe.yaml)
   - Current-best recipe and its performance
   - Other recipes and their tags (baseline, candidate, variant)
   - Parent lineage to understand experiment history

2. **Active Experiments** (mlspec/experiments/*/experiment.yaml)
   - Status: draft, running, resolved
   - base_recipe and proposed_recipe
   - proposed_change description
   - Existing evidence rungs

3. **Evidence** (mlspec/experiments/*/evidence/*.md)
   - Evidence files per rung (e.g., evidence/pilot.md, evidence/validation.md)
   - Runs, metrics, and comparisons
   - Compare to base recipe metrics

4. **Findings** (mlspec/findings/*.md)
   - What works and what doesn't
   - Documented lessons from past experiments

---

**Output Format**

\`\`\`
## Exploration Results

### Current Best Recipe
- **ID**: rf-mfcc-v1
- **Metrics**: accuracy=0.934, f1=0.921

### Active Experiments
1. add-eos-tokens (running) - pilot complete

### Opportunities Identified
1. EOS tokens: Pilot shows +0.5% perplexity improvement

### Recommended Next Experiment
- **Base**: rf-mfcc-v1
- **Change**: Add ROI cropping

Next: /mlspec-propose add-roi-cropping
\`\`\`

---

### Blocked: User Requests Modification

## Explore Mode Blocked

Explore mode is read-only and cannot create experiments or run training.

**What you can do:**
- Propose a new experiment: /mlspec-propose <description>
- Run evidence collection: /mlspec-run <experiment> <rung>
- Resolve an experiment: /mlspec-resolve <experiment>
- Ask /mlspec-next for guidance

---

**Inference from Workspace**

When context is unclear, infer from:
- Current-best recipe tags
- Active experiments with incomplete evidence
- User's stated goals

When genuinely ambiguous, ask one focused question.`,
  };
}
