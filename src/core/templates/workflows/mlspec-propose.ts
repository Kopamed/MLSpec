/**
 * MLSpec Propose Skill Template
 *
 * Skill for creating experiments from ideas.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getMlspecProposeSkillTemplate(): SkillTemplate {
  return {
    name: 'mlspec-propose',
    description: 'Create a new MLSpec experiment from an idea. Define base_recipe, proposed_recipe, proposed_change, controlled_variables, success_criteria, abort_criteria, and evidence_plan.',
    instructions: `Create a new MLSpec experiment from an idea.

This skill creates an experiment entry and populates hypothesis.md with a well-structured experimental plan. It infers missing context from workspace and conversation.

---

**Pause if:**
- Context is genuinely ambiguous after inference → ask one clarifying question
- User wants to skip hypothesis definition → "A hypothesis is required for valid experiments."
- User wants to run training during proposal → "Training happens during /mlspec-run, not /mlspec-propose."

---

## Bootstrap Mode: Create First Baseline Recipe

**FIRST**: Run \`mlspec status --json\` to detect workspace state.

If the JSON output shows:
- \`recipes.length === 0\`: Enter bootstrap mode (no recipes exist yet)
- \`current_best_recipes\`: Array of recipes with 'current-best' tag (use to detect single vs multiple baselines)
- \`experiments.by_status\`: Object with draft/running/resolved arrays (use to avoid duplicate experiment IDs)

If \`mlspec status --json\` fails, fall back to file inspection:
- Check if \`mlspec/recipes/\` is empty (no recipe subdirectories exist)

If no recipes exist, enter **bootstrap mode** and create a root baseline recipe (NOT an experiment):

### Bootstrap Steps

1. **Infer Baseline Recipe ID**
   - Infer from project name, config/model name, or ask user
   - Fallback: use \`baseline-v1\`
   - If obvious from context, proceed without asking

2. **Show Inferred Action**

   \`\`\`
   I'm going to create the first baseline recipe:
   - Recipe ID: <baseline-id>
   - Tags: baseline, current-best
   - parent_recipe: null
   - created_by_experiment: null

   Proceeding...
   \`\`\`

3. **Create Root Recipe**

   \`\`\`bash
   mlspec new recipe <baseline-id> --tag baseline
   mlspec tag recipe <baseline-id> current-best
   \`\`\`

4. **Greenfield Bootstrap** (no existing scripts/configs):
   - Create skeletal recipe with TODO config fields
   - Mark metrics as pending
   - Output recommendation for implementation work or /mlspec-run

5. **Brownfield Bootstrap** (existing scripts/configs found):
   - Attempt best-effort metric discovery from:
     - Local scripts, configs, outputs, logs, notebooks
     - README or documentation
     - Local W&B/MLflow artifacts or references if present
   - No external service access required
   - Populate metrics in recipe.yaml if clearly discoverable
   - Leave metrics empty/pending if not clearly discoverable

6. **Bootstrap Output Format**

   \`\`\`
   ## Baseline Recipe Created: <baseline-id>

   ### Summary
   - **Type**: Root baseline recipe
   - **Tags**: baseline, current-best
   - **parent_recipe**: null
   - **created_by_experiment**: null

   ### Configuration
   <TODO: fill in your baseline configuration>

   ### Metrics
   <pending - run evaluation to establish baseline metrics>

   ### Next Steps
   1. Implement baseline approach if not yet implemented
   2. Run /mlspec-run to establish baseline metrics

   Next: /mlspec-run
   \`\`\`

---

## Normal Mode: Create Experiment

(When at least one recipe already exists, proceed with normal experiment creation below)

**Input**: Experiment ID and optionally base_recipe, proposed_recipe, or change description.

---

**Steps**

1. **Infer Context**
   - Check for prior /mlspec-explore output suggesting an experiment
   - Look for current-best recipe to use as base
   - Check active experiments to avoid duplicate ideas

2. **Confirm or Ask for:**
   - experiment ID (kebab-case, e.g., add-roi-cropping)
   - base_recipe (the recipe you're modifying)
   - proposed_recipe (the new recipe ID you'll create if accepted)
   - proposed_change (what you're changing)

3. **Create the Experiment**

   \`\`\`bash
   mlspec new experiment <id> --from <base_recipe> --proposes <proposed_recipe>
   \`\`\`

   This creates mlspec/experiments/<id>/ with:
   - experiment.yaml (metadata)
   - hypothesis.md (template)

4. **Fill hypothesis.md**

   Help the user define:
   - **Controlled Variables**: What stays the same (model type, data split, seeds, evaluation)
   - **Success Criteria**: Metric improvements that justify acceptance
   - **Abort Criteria**: Results that indicate early stopping
   - **Evidence Plan**: smoke -> validation -> final progression

5. **Validate**

   \`\`\`bash
   mlspec validate
   \`\`\`

---

**Inference Rules**

| If user says... | Infer... |
|-----------------|----------|
| "propose add-roi-cropping" | base_recipe = current-best tagged recipe |
| "propose from rf-mfcc-v1" | base_recipe = rf-mfcc-v1 |
| "test LSTM against RNN" | base_recipe = RNN recipe, proposed = LSTM recipe |

If multiple inferences possible, ask one question.

---

**Output Format**

\`\`\`
## Experiment Created: add-roi-cropping

### Summary
- **Base**: rf-mfcc-v1
- **Proposed**: rf-mfcc-roi-v1
- **Change**: Add ROI cropping before classification

### Hypothesis
ROI cropping will improve accuracy by >1% while keeping everything else fixed.

### Controlled Variables
- Feature extraction: MFCC parameters unchanged
- Classifier: Random Forest same hyperparameters
- Training data: Same dataset split

### Success Criteria
- Validation accuracy improvement > 1%
- No degradation on F1 score

### Abort Criteria
- Smoke run fails to complete
- Validation shows accuracy decrease

### Evidence Plan
1. smoke: Quick run on subset (does it work?)
2. validation: Full CV against base
3. final: Production evaluation

### Next Steps
1. Run smoke evidence: /mlspec-run smoke add-roi-cropping
2. Explore alternatives: /mlspec-explore
\`\`\`

### Blocked: Context Ambiguous

\`\`\`
## Proposal Blocked: Context Ambiguous

I need clarification to create a valid experiment:

<specific question>

**Options:**
1. Answer the question above
2. Provide more context about what you want to change
3. Ask /mlspec-explore to identify opportunities
\`\`\`

---

**Boundaries**

**Bootstrap Mode (no recipes):**
- Creates: mlspec/recipes/<id>/recipe.yaml (root recipe with parent_recipe: null, created_by_experiment: null)
- Tags: baseline, current-best
- Forbidden: Run training, accept/reject, create experiments

**Normal Mode (recipes exist):**
**Creates:**
- mlspec/experiments/<id>/experiment.yaml
- mlspec/experiments/<id>/hypothesis.md

**Must Define:**
- base_recipe, proposed_recipe, proposed_change
- controlled_variables, success_criteria, abort_criteria
- evidence_plan

**Forbidden:**
- Run training
- Accept/reject/retry/hold/inconclusive
- Create recipe nodes (except in bootstrap mode)

---

**Show Inferred Action Before Executing**

Bootstrap mode (no recipes):
\`\`\`
I'm going to create the first baseline recipe:
- Recipe ID: <baseline-id>
- Tags: baseline, current-best
- parent_recipe: null
- created_by_experiment: null

Proceeding...
\`\`\`

Normal mode (recipes exist):
\`\`\`
I'm going to create experiment "add-roi-cropping":
- base_recipe: rf-mfcc-v1 (current-best)
- proposed_recipe: rf-mfcc-roi-v1
- proposed_change: Add ROI cropping before classification

Proceeding...
\`\`\`

**When Genuinely Ambiguous** (bootstrap mode):

If baseline ID or approach is genuinely ambiguous, ask one focused question:
\`\`\`
I found multiple possible baseline approaches in your project:
1. CNN classifier in src/model.py
2. Traditional ML in train.py
3. Existing config in params.json

Which should I use as the baseline?
\`\`\`

If obvious from context (project name, single script, etc.), proceed without asking.
`,
    license: 'MIT',
    compatibility: 'Requires MLSpec v2 workspace',
    metadata: { author: 'mlspec', version: '2.0' },
  };
}

export function getMlspecProposeCommandTemplate(): CommandTemplate {
  return {
    name: 'MLSpec: Propose Experiment',
    description: 'Create a new MLSpec experiment from an idea with full hypothesis definition.',
    category: 'Workflow',
    tags: ['workflow', 'mlspec', 'ml', 'experiment', 'propose'],
    content: `Create a new MLSpec experiment from an idea.

This skill creates an experiment entry with hypothesis. It infers missing context from workspace.

---

**Pause if:**
- Context ambiguous after inference → ask one question
- User wants to skip hypothesis → "A hypothesis is required."

---

**Input**: experiment ID and optionally base_recipe, proposed_recipe, or change.

---

**Workspace Detection**

Before creating experiments, run \`mlspec status --json\` to detect:
- Empty workspace → bootstrap mode
- current_best_recipes → single or multiple baselines (ambiguous if length > 1)
- experiments.by_status → existing experiments to avoid duplicate IDs

If JSON command fails, fall back to file inspection.

---

**Steps**

1. **Infer Context** - Check for prior exploration output or current-best recipe
2. **Confirm Details** - base_recipe, proposed_recipe, proposed_change
3. **Create Experiment** - mlspec new experiment <id> --from <base> --proposes <proposed>
4. **Fill hypothesis.md** - controlled_variables, success_criteria, abort_criteria, evidence_plan
5. **Validate** - mlspec validate

---

**Inference Rules**

| If user says... | Infer... |
|-----------------|----------|
| "propose X" | base_recipe = current-best |
| "propose from Y" | base_recipe = Y |

If ambiguous, ask one question.

---

**Output Format**

\`\`\`
## Experiment Created: <id>

### Summary
- **Base**: <base_recipe>
- **Proposed**: <proposed_recipe>
- **Change**: <proposed_change>

### Next Steps
/mlspec-run smoke <id>
\`\`\`

---

**Boundaries**

**Creates:** experiment.yaml, hypothesis.md
**Forbidden:** Run training, resolve experiments`,
  };
}
