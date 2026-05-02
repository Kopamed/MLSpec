/**
 * MLSpec Resolve Skill Template
 *
 * Skill for resolving experiments based on evidence.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getMlspecResolveSkillTemplate(): SkillTemplate {
  return {
    name: 'mlspec-resolve',
    description: 'Resolve an experiment (accept, reject, retry, hold, inconclusive) based on evidence. Accept creates a new recipe node.',
    instructions: `Resolve an experiment based on evidence.

This skill reads all evidence for an experiment and creates a resolution. On accept, it creates a new recipe node.

---

**Input**: Optional experiment ID and resolution type.

---

**Resolution Types**

| Type | Action |
|------|--------|
| accept | Create new recipe from experiment |
| reject | End experiment, no recipe |
| retry | Return to running with modifications |
| hold | Pause for later review |
| inconclusive | Evidence neither supports nor refutes |

---

**Steps**

1. **Infer or Confirm**
   - experiment ID (from active experiments with evidence)
   - resolution type (infer from evidence + success_criteria, or ask)

2. **Read All Evidence**
   - mlspec/experiments/<id>/evidence/smoke.md
   - mlspec/experiments/<id>/evidence/validation.md
   - mlspec/experiments/<id>/evidence/final.md

3. **Show Inferred Action**

   \`\`\`
   I'm going to resolve experiment "add-roi-cropping":
   - Resolution: accept
   - Evidence: validation shows +1.1% accuracy improvement
   - Recipe to create: rf-mfcc-roi-v1
   - Tags: candidate

   Proceeding...
   \`\`\`

4. **Check Acceptance Warning Matrix**

   | Evidence Stage | accept as candidate | accept as current-best |
   |----------------|---------------------|-----------------------|
   | smoke | warning | strong warning |
   | validation | ok | normal |
   | final | ok | strongest support |

   Show warnings but allow proceed.

5. **Write Resolution File**

   \`\`\`bash
   mlspec/experiments/<id>/resolution.md
   \`\`\`

   \`\`\`yaml
   ---
   entity_type: resolution
   experiment_id: add-roi-cropping
   resolution: accept
   accepted_recipe: rf-mfcc-roi-v1
   accepted_tags: [candidate]
   rationale: "Validation shows +1.1% accuracy improvement with ROI cropping"
   supporting_evidence:
     - stage: validation
       summary: "Accuracy 0.945 vs 0.934 base (+1.1%)"
   created: 2026-05-01T12:00:00Z
   ---
   \`\`\`

6. **If Accept: Create Recipe Node**

   \`\`\`bash
   # Recipe already created by mlspec accept command
   mlspec/recipes/rf-mfcc-roi-v1/recipe.yaml
   mlspec/recipes/rf-mfcc-roi-v1/summary.md
   \`\`\`

7. **Run mlspec-next**

   After resolving, show next recommended action.

---

**Acceptance Warning Matrix**

When accepting, check evidence stage vs target tag:

- **smoke + candidate**: "Accepting as candidate from smoke evidence is premature"
- **smoke + current-best**: "Strong warning: accepting as current-best from smoke"
- **validation + current-best**: Proceed normally
- **final + current-best**: Note "Final evidence provides strongest support"

Show warnings but respect user agency.

---

**Output Format**

\`\`\`
## Experiment Resolved: add-roi-cropping

### Resolution: ACCEPT

### Created Recipe
- **ID**: rf-mfcc-roi-v1
- **Parent**: rf-mfcc-v1
- **Tags**: [candidate]
- **Evidence**: validation (+1.1% accuracy)

### Supporting Evidence
- validation: Accuracy 0.945 vs 0.934 base (+1.1%)

---

Next recommended action:
\`\`\`

Then run /mlspec-next to show what to do next.

---

**Boundaries**

**Must Do:**
- Read all evidence files
- Write resolution.md
- If accept: create recipe node
- Run mlspec-next after resolving

**Forbidden:**
- Run training
- Brainstorm unrelated ideas
- Auto-archive
`,
    license: 'MIT',
    compatibility: 'Requires MLSpec v2 workspace',
    metadata: { author: 'openspec', version: '2.0' },
  };
}

export function getMlspecResolveCommandTemplate(): CommandTemplate {
  return {
    name: 'MLSpec: Resolve Experiment',
    description: 'Resolve an experiment (accept, reject, retry, hold, inconclusive) based on evidence.',
    category: 'Workflow',
    tags: ['workflow', 'mlspec', 'ml', 'experiment', 'resolve'],
    content: `Resolve an experiment based on evidence.

This skill resolves an experiment and creates a resolution document.

---

**Resolution Types**

| Type | Action |
|------|--------|
| accept | Create new recipe |
| reject | End experiment |
| retry | Return to running |
| hold | Pause for later |
| inconclusive | Evidence unclear |

---

**Steps**

1. **Infer/Confirm** experiment and resolution type
2. **Read All Evidence** - smoke, validation, final
3. **Show Inferred Action**
4. **Write resolution.md**
5. **If accept**: Create recipe node
6. **Run /mlspec-next**

---

**Acceptance Warnings**

| Stage | → candidate | → current-best |
|-------|-------------|---------------|
| smoke | warning | strong |
| validation | ok | normal |
| final | ok | strongest |

---

**Boundaries**

**Allowed:** Write resolution, create recipe (if accept)
**Forbidden:** Run training, brainstorm`,
  };
}