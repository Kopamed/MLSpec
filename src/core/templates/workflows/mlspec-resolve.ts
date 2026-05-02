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

**Pause if:**
- Experiment status is 'resolved' → output "already resolved" blocked state
- Evidence contradicts itself across stages → output "evidence conflict" blocked state

---

**Input**: Optional experiment ID and resolution type.

---

**Pre-flight Checks**

Before resolving:

1. **Check experiment status**
   - Run: \`mlspec status --experiment <id> --json\`
   - If status === 'resolved':
     - Output blocked state: "Resolution Blocked: Already Resolved"
     - Do NOT proceed
     - Suggest /mlspec-next
   - Note: \`mlspec status --experiment <id>\` is JSON-only in 2.1.0; it returns JSON error if --json is omitted

2. **Check evidence exists**
   - Run: \`mlspec show evidence <id> --json\`
   - If no evidence stages have \`exists: true\`:
     - Show warning: "No evidence recorded. Resolving without evidence is not recommended."
     - Allow proceed if user confirms

3. **Check for evidence conflicts**
   - From \`mlspec show evidence --json\` output, check recommendations across stages
   - If smoke recommends 'accept' but final recommends 'reject' (or vice versa):
     - Output blocked state: "Resolution Blocked: Evidence Conflict"
     - Pause asking how to proceed

If JSON commands fail, fall back to direct file inspection.

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

### Success

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
\`\`\`

### Blocked: Already Resolved

\`\`\`
## Resolution Blocked: Already Resolved

Experiment '<id>' is already resolved.
It cannot be resolved again.

**Current status:**
- Resolution: see \`mlspec/experiments/<id>/resolution.md\`
- Recipe: <recipe_id> (if accepted)

**What to do:**
- Use /mlspec-next to find other actions
- Use /mlspec-run to collect more evidence if needed
\`\`\`

### Blocked: Evidence Conflict

\`\`\`
## Resolution Blocked: Evidence Conflict

Evidence stages have conflicting recommendations:

| Stage | Recommendation |
|-------|---------------|
| smoke | accept |
| validation | reject |

**Options:**
1. **Proceed anyway** - Accept the conflict and resolve with user-provided rationale
2. **Collect more evidence** - Run /mlspec-run to clarify
3. **Cancel** - Stop and reconsider

What would you like to do?
\`\`\`

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
    metadata: { author: 'mlspec', version: '2.0' },
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

**Pause if:**
- Experiment already resolved → blocked state
- Evidence conflict → blocked state

---

**Pre-flight Checks**

1. Run \`mlspec status --experiment <id> --json\` to check experiment status
2. Run \`mlspec show evidence <id> --json\` to check evidence stages and recommendations
3. Check for evidence conflicts across stages

If JSON commands fail, fall back to file inspection.

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
2. **Pre-flight checks** (status, evidence, conflicts)
3. **Read All Evidence** - smoke, validation, final
4. **Show Inferred Action**
5. **Write resolution.md**
6. **If accept**: Create recipe node
7. **Run /mlspec-next**

---

**Blocked State: Already Resolved**

Experiment is already resolved. Use /mlspec-next.

---

**Blocked State: Evidence Conflict**

Evidence stages have conflicting recommendations.
Options: proceed anyway / collect more evidence / cancel

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