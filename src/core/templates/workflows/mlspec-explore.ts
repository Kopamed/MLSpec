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

**Input**: Optional focus area or question from conversation.

---

**What to Inspect**

1. **Recipes** (mlspec/recipes/*/recipe.yaml)
   - Current-best recipe and its performance
   - Other recipes and their tags (baseline, candidate, variant)
   - Parent lineage to understand experiment history

2. **Active Experiments** (mlspec/experiments/*/experiment.yaml)
   - Status: draft, running, resolved
   - base_recipe and proposed_recipe
   - proposed_change description
   - Existing evidence stages

3. **Evidence** (mlspec/experiments/*/evidence/*.md)
   - smoke/validation/final evidence files
   - Runs, metrics, and recommendations
   - Compare to base recipe metrics

4. **Findings** (mlspec/findings/*.md)
   - What works and what doesn't
   - Documented lessons from past experiments

5. **Code and Data** (optional)
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
1. add-roi-cropping (running) - smoke complete, validation in progress
2. tune-n-estimators (draft) - waiting to start

### Opportunities Identified
1. **ROI cropping**: Smoke shows +1.2% accuracy - promising
2. **Feature selection**: Could reduce overfitting
3. **Ensemble**: Combine top 2 recipes

### Recommended Next Experiment
- **Base**: rf-mfcc-v1 (current-best)
- **Change**: Add ROI cropping before classification
- **Hypothesis**: ROI cropping will improve accuracy by >1%

Next: /mlspec-propose add-roi-cropping --from rf-mfcc-v1 --proposes rf-mfcc-roi-v1
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
    compatibility: 'Requires MLSpec v2 workspace',
    metadata: { author: 'openspec', version: '2.0' },
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

**Input**: Optional focus area or question from conversation.

---

**What to Inspect**

1. **Recipes** (mlspec/recipes/*/recipe.yaml)
   - Current-best recipe and its performance
   - Other recipes and their tags (baseline, candidate, variant)
   - Parent lineage to understand experiment history

2. **Active Experiments** (mlspec/experiments/*/experiment.yaml)
   - Status: draft, running, resolved
   - base_recipe and proposed_recipe
   - proposed_change description
   - Existing evidence stages

3. **Evidence** (mlspec/experiments/*/evidence/*.md)
   - smoke/validation/final evidence files
   - Runs, metrics, and recommendations
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
1. add-roi-cropping (running) - smoke complete

### Opportunities Identified
1. ROI cropping: Smoke shows +1.2% accuracy

### Recommended Next Experiment
- **Base**: rf-mfcc-v1
- **Change**: Add ROI cropping

Next: /mlspec-propose add-roi-cropping
\`\`\`

---

**Boundaries**

**Allowed:** Inspect, reason, propose
**Forbidden:** Create files, run training, resolve

---

**Inference from Workspace**

When context is unclear, infer from:
- Current-best recipe tags
- Active experiments with incomplete evidence
- User's stated goals

When genuinely ambiguous, ask one focused question.`,
  };
}