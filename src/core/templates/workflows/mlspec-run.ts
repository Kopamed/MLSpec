/**
 * MLSpec Run Skill Template (V3)
 *
 * Skill for collecting evidence for experiments using rung-based evidence ladder.
 */
import type { SkillTemplate, CommandTemplate } from "../types.js";

export function getMlspecRunSkillTemplate(): SkillTemplate {
  return {
    name: "mlspec-run",
    description:
      "Collect evidence for an experiment at a specific rung (pilot, validation, etc.). Uses rung-based evidence ladder from protocol.md.",
    instructions: `Collect evidence for an experiment at a specific rung.

This skill collects evidence for an experiment using the rung-based evidence ladder defined in protocol.md. It replaces the old stage-based (smoke/validation/final) evidence collection.

---

## Prerequisites

- prepare.md exists with status=ready
- protocol.md defines the evidence ladder
- You have reviewed protocol.md and understand the target rung

---

**Pause if:**
- prepare.md does not exist or status!=ready → "Run /mlspec-prepare first"
- Evidence file already exists for the target rung → output blocked state with overwrite/skip options
- Rung not found in protocol.md → "Rung '<rung>' not found in protocol.evidence_ladder"
- User provides unclear or incomplete results → ask for clarification

---

## Evidence Collection Steps

### 1. Infer or Confirm Target Rung

- experiment ID (from context, conversation, or ask)
- rung ID (from evidence ladder or ask)
- Confirm the rung exists in protocol.md

**Rung Inference Rules:**

| Evidence State | Default Rung |
|----------------|--------------|
| No evidence yet | First rung in ladder |
| Some rungs complete | Next incomplete rung |
| All rungs complete | Ask (experiment may be ready for resolution) |

### 2. Show Inferred Action

\`\`\`
I'm going to collect evidence for experiment "add-eos-tokens":
- Rung: validation
- Base: baseline-v1
- Treatment: eos-token-v1
- Budget: 1M tokens

Proceeding...
\`\`\`

### 3. Pre-flight Gate Check

**Before collecting evidence, run:**

\`\`\`bash
mlspec run <experiment> <rung>
\`\`\`

This is a preflight gate checker. It validates:
- prepare.md exists with status=ready
- Rung exists in protocol.evidence_ladder
- evidence/<rung>.md does not already exist

If the gate check fails, the CLI will error. Fix the issue before proceeding.

### 4. Train Baseline Arm (if required)

**Check protocol.md for baseline requirements:**
- If \`baseline_requirements.<rung>.required: true\` and no existing baseline:
  - Train baseline_arm per rung config
- If \`baseline_arm.recipe_ref\` exists: use that recipe
- If \`train_from_scratch: true\`: train from scratch

**Run baseline training:**
\`\`\`bash
python train.py --config configs/train.yaml --recipe baseline-v1 --output outputs/baseline-validation/
\`\`\`

### 5. Train Treatment Arm

**Run treatment training:**
\`\`\`bash
python train.py --config configs/train.yaml --recipe eos-token-v1 --output outputs/treatment-validation/
\`\`\`

### 6. Run Benchmark on Both Arms

\`\`\`bash
python scripts/evaluate.py --experiment validation --dataset test
\`\`\`

### 7. Compute Comparison Metrics

If rung.comparison.comparison_required is true:
- Compute comparison_metric between baseline and treatment
- Calculate delta and delta_percent
- Check against success_threshold

### 8. Write evidence/<rung>.md

Create the evidence file with this structure:

\`\`\`yaml
---
entity_type: evidence
schema: ml-experiment-v3
experiment_id: add-eos-tokens
rung: validation
budget:
  model_params: 124M
  training_tokens: 1000000
baseline_arm:
  recipe_ref: baseline-v1
  runs:
    - seed: 42
      command: python train.py ...
      completed: 2026-05-01T12:30:00Z
      duration_minutes: 45
      metrics:
        loss: 2.34
        accuracy: 0.823
treatment_arm:
  recipe_ref: eos-token-v1
  runs:
    - seed: 42
      command: python train.py ...
      completed: 2026-05-01T13:15:00Z
      duration_minutes: 45
      metrics:
        loss: 2.28
        accuracy: 0.831
aggregate:
  baseline:
    loss: { mean: 2.34, std: 0.02 }
    accuracy: { mean: 0.823, std: 0.005 }
  treatment:
    loss: { mean: 2.28, std: 0.02 }
    accuracy: { mean: 0.831, std: 0.005 }
comparison:
  comparison_metric: accuracy
  baseline_value: 0.823
  treatment_value: 0.831
  delta: 0.008
  delta_percent: 0.97
  success: true
abort_criteria_evaluation: []
---

## Evidence Summary

[Detailed evidence body with dataset profile, training logs, etc.]
\`\`\`

### 9. Update Experiment Status

**When first evidence is written for a draft experiment:**
- Update experiment.yaml status to running
- This is done by the skill, NOT by CLI

### 10. Show Summary

\`\`\`
## Evidence Collected: add-eos-tokens (validation)

### Results
| Arm | Seed | Loss | Accuracy |
|-----|------|------|----------|
| Baseline | 42 | 2.34 | 0.823 |
| Treatment | 42 | 2.28 | 0.831 |

### Comparison
- Accuracy: +0.8% (0.823 → 0.831)
- Success threshold met: YES

### Next Steps
- Collect evidence for next rung: /mlspec-run add-eos-tokens validation
- Or resolve experiment: /mlspec-resolve add-eos-tokens
\`\`\`

---

## Blocked: Evidence Exists

\`\`\`
## Evidence Collection Blocked

Evidence for rung '<rung>' already exists for experiment '<id>'.
The CLI will fail if you try to overwrite.

**Options:**
1. **Overwrite** - Delete existing evidence file and collect new results
2. **Skip** - Use existing evidence and take no action
3. **Cancel** - Stop and use /mlspec-next to find other actions

What would you like to do?
\`\`\`

---

## CLI vs Skill Boundary

**CLI (mlspec run) does:**
- Validates prepare.md status=ready
- Validates rung exists in protocol.evidence_ladder
- Checks evidence/<rung>.md doesn't already exist

**Skill does:**
- All ML work (training, benchmarking, metrics)
- Writing evidence/<rung>.md
- Updating experiment.yaml status to running

**CLI never:**
- Invokes skills
- Trains models
- Writes evidence files

---

**Boundaries**

**Must Do:**
- Read protocol.md to understand rung structure
- Verify prepare.md status=ready before proceeding
- Train baseline_arm if required (or use existing)
- Train treatment_arm
- Run benchmark on both arms
- Compute comparison metrics
- Write evidence/<rung>.md
- Update experiment.yaml status to running

**Forbidden:**
- Resolve/accept/reject (use /mlspec-resolve)
- Create recipe nodes
- Tag current-best
- Skip prepare stage

---

**When Ambiguous**

If multiple experiments or rungs are plausible, ask one question:
\`\`\`
I see two active experiments:
1. add-eos-tokens (pilot complete, needs validation)
2. add-roi-cropping (draft, needs prepare)

Which experiment should I collect evidence for?
\`\`\`
`,
    license: "MIT",
    compatibility: "Requires MLSpec v3 workspace with protocol.md and prepare.md",
    metadata: { author: "mlspec", version: "3.0" },
  };
}

export function getMlspecRunCommandTemplate(): CommandTemplate {
  return {
    name: "MLSpec: Run Evidence",
    description:
      "Collect evidence for an experiment at a specific rung using the evidence ladder.",
    category: "Workflow",
    tags: ["workflow", "mlspec", "ml", "experiment", "run", "evidence", "v3"],
    content: `Collect evidence for an experiment at a specific rung.

This skill uses rung-based evidence collection (pilot, validation, etc.) from protocol.md.

---

**Pause if:**
- prepare.md does not exist or status!=ready → Run /mlspec-prepare first
- Evidence file already exists → blocked state (overwrite/skip/cancel)
- Rung not found in protocol.md

---

**Before collecting evidence:**

Run \`mlspec run <experiment> <rung>\` for pre-flight gate check.

---

**Steps**

1. **Infer/Confirm** experiment ID and rung
2. **Show Inferred Action**
3. **Run preflight gate check** (mlspec run)
4. **Train baseline_arm** (if required)
5. **Train treatment_arm**
6. **Run benchmark** on both arms
7. **Compute comparison metrics** (if comparison_required)
8. **Write evidence/<rung>.md**
9. **Update experiment.yaml status** to running
10. **Show Summary**

---

**Blocked State: Evidence Exists**

Options:
1. **Overwrite** - Delete file and collect new results
2. **Skip** - Use existing evidence, take no action
3. **Cancel** - Stop, use /mlspec-next

---

**Evidence Structure**

\`\`\`yaml
entity_type: evidence
schema: ml-experiment-v3
experiment_id: <id>
rung: <rung-id>
baseline_arm:
  recipe_ref: <recipe>
  runs: [{seed, command, metrics, ...}]
treatment_arm:
  recipe_ref: <recipe>
  runs: [{seed, command, metrics, ...}]
aggregate: {baseline: {...}, treatment: {...}}
comparison: {metric, delta, success} | null
\`\`\`

---

**Boundaries**

**Allowed:** Collect evidence, run training, write evidence files
**Forbidden:** Resolve, create recipes, tag current-best, skip prepare

---

**When Ambiguous**

Ask one question about which experiment or rung.`,
  };
}
