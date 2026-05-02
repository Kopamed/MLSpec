/**
 * MLSpec Run Skill Template
 *
 * Skill for running or recording evidence for experiments.
 */
import type { SkillTemplate, CommandTemplate } from '../types.js';

export function getMlspecRunSkillTemplate(): SkillTemplate {
  return {
    name: 'mlspec-run',
    description: 'Run or record evidence for an experiment at a specific stage (smoke, validation, final). Infers experiment ID and stage from context.',
    instructions: `Run or record evidence for an experiment.

This skill records evidence for an experiment at a specific stage. It infers the experiment ID and stage from workspace state and conversation context.

---

**Input**: Optional experiment ID and/or stage.

---

**Stage Inference Rules**

| Evidence State | Default Stage |
|----------------|---------------|
| No evidence yet | smoke |
| smoke exists, no validation | validation |
| validation exists | ask (could be more validation or final) |
| final exists | ask (experiment may be ready for resolution) |

---

**Steps**

1. **Infer or Confirm**
   - experiment ID (from context, conversation, or ask)
   - stage (from evidence state or ask)
   - Confirm base_recipe and proposed_change match intent

2. **Show Inferred Action**

   \`\`\`
   I'm going to record evidence for experiment "add-roi-cropping":
   - Stage: validation
   - Base: rf-mfcc-v1
   - Proposed change: Add ROI cropping

   Proceeding...
   \`\`\`

3. **Run or Record**

   Option A: Run actual training
   \`\`\`bash
   # Run your training command
   python train.py --config mlspec/recipes/rf-mfcc-v1/config.yaml --modifications roi-cropping
   \`\`\`

   Option B: Record existing results
   \`\`\`bash
   mlspec add-evidence <experiment> --stage <stage> --metrics '{"accuracy": 0.945}'
   \`\`\`

4. **Update Evidence File**
   - Read experiment.yaml and hypothesis.md
   - Create/update mlspec/experiments/<id>/evidence/<stage>.md
   - Record runs, metrics, artifacts
   - Set recommendation based on results

5. **Show Summary**

   \`\`\`
   ## Evidence Recorded: add-roi-cropping (validation)

   ### Results
   | Seed | Accuracy | F1 |
   |------|----------|-----|
   | 42 | 0.945 | 0.932 |
   | 43 | 0.942 | 0.929 |
   | 44 | 0.947 | 0.934 |

   ### Aggregate
   - Accuracy: 0.945 ± 0.002
   - F1: 0.932 ± 0.002

   ### Comparison to Base (rf-mfcc-v1)
   - Accuracy: +1.1% (0.934 → 0.945)
   - F1: +0.8% (0.924 → 0.932)

   ### Recommendation
   Positive signal! Consider proceeding to final or resolving.

   Next: /mlspec-resolve add-roi-cropping
   \`\`\`

---

**Evidence File Structure**

Each evidence file (smoke.md, validation.md, final.md) contains:

\`\`\`yaml
---
entity_type: evidence
experiment_id: add-roi-cropping
stage: validation
created: 2026-05-01T12:00:00Z
runs:
  - seed: 42
    command: python train.py ...
    completed: 2026-05-01T12:30:00Z
    duration_minutes: 30
    metrics:
      accuracy: 0.945
      f1: 0.932
aggregate:
  accuracy:
    mean: 0.945
    std: 0.002
  f1:
    mean: 0.932
    std: 0.002
summary: "ROI cropping improves accuracy by ~1%"
recommendation: accept
---

## Evidence Summary
...
\`\`\`

---

**Boundaries**

**Must Do:**
- Read experiment.yaml and hypothesis.md
- Confirm base_recipe and proposed_change
- Create/update evidence/<stage>.md
- Record metrics, artifacts, runs

**Forbidden:**
- Accept/reject/retry/hold/inconclusive
- Create recipe nodes
- Tag current-best

---

**When Ambiguous**

If multiple experiments or stages are plausible, ask one question:
\`\`\`
I see two active experiments:
1. add-roi-cropping (smoke complete, needs validation)
2. tune-n-estimators (draft, no evidence)

Which experiment should I record evidence for?
\`\`\`
`,
    license: 'MIT',
    compatibility: 'Requires MLSpec v2 workspace',
    metadata: { author: 'openspec', version: '2.0' },
  };
}

export function getMlspecRunCommandTemplate(): CommandTemplate {
  return {
    name: 'MLSpec: Run Evidence',
    description: 'Run or record evidence for an experiment at smoke, validation, or final stage.',
    category: 'Workflow',
    tags: ['workflow', 'mlspec', 'ml', 'experiment', 'run', 'evidence'],
    content: `Run or record evidence for an experiment.

This skill records evidence at a specific stage (smoke/validation/final).

---

**Input**: Optional experiment ID and stage.

---

**Stage Inference**

| State | Default Stage |
|-------|--------------|
| No evidence | smoke |
| smoke complete | validation |
| validation complete | ask |

---

**Steps**

1. **Infer/Confirm** experiment ID and stage
2. **Show Inferred Action**
3. **Run Training or Record Results**
4. **Update evidence/<stage>.md**
5. **Show Summary**

---

**Evidence Structure**

runs: [{seed, command, metrics, ...}]
aggregate: {metric: {mean, std}, ...}
recommendation: accept/reject/none

---

**Boundaries**

**Allowed:** Record evidence, run training
**Forbidden:** Resolve, create recipes, tag current-best

---

**When Ambiguous**

Ask one question about which experiment or stage.`,
  };
}