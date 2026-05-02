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
   - **Evidence Plan**: smoke → validation → final progression

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

### Evidence Plan
1. smoke: Quick run on subset (does it work?)
2. validation: Full CV against base
3. final: Production evaluation

### Next Steps
1. Run smoke evidence: /mlspec-run smoke add-roi-cropping
2. Explore alternatives: /mlspec-explore
\`\`\`

---

**Boundaries**

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
- Create recipe nodes

---

**Show Inferred Action Before Executing**

\`\`\`
I'm going to create experiment "add-roi-cropping":
- base_recipe: rf-mfcc-v1 (current-best)
- proposed_recipe: rf-mfcc-roi-v1
- proposed_change: Add ROI cropping before classification

Proceeding...
\`\`\`
`,
    license: 'MIT',
    compatibility: 'Requires MLSpec v2 workspace',
    metadata: { author: 'openspec', version: '2.0' },
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

**Input**: experiment ID and optionally base_recipe, proposed_recipe, or change.

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