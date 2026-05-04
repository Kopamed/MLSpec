/**
 * MLSpec Prepare Skill Template
 *
 * Skill for performing engineering readiness verification before evidence collection.
 */
import type { SkillTemplate, CommandTemplate } from "../types.js";

export function getMlspecPrepareSkillTemplate(): SkillTemplate {
  return {
    name: "mlspec-prepare",
    description:
      "Perform engineering readiness verification before evidence collection. Checks transform implementation, benchmark scripts, training startup, and baseline availability.",
    instructions: `Perform engineering readiness verification for an experiment.

This skill performs engineering readiness checks before evidence collection begins. It verifies that the implementation is correct and the experiment can run.

---

## Prerequisites

- Experiment exists with protocol.md defining evidence ladder
- You have reviewed protocol.md and understand the rung structure

---

## Pause Conditions

- Transform implementation has bugs → report blocking_issues
- Benchmark scripts don't work → report blocking_issues
- Training fails startup check → report blocking_issues
- Baseline unavailable for required rung → report blocking_issues
- Semantic mismatches detected → report protocol_issues with protocol_change_required status

---

## Engineering Readiness Checks

### 1. Transform Implementation Check

**When to run:** If protocol.md indicates data_intervention exists

**What to check:**
- Transform code runs without errors
- Input/output shapes are correct
- Transform produces expected output format

**How to check:**
\`\`\`bash
# Run transform on small sample
python -c "from transform import your_transform; print(your_transform(sample_input))"
\`\`\`

### 2. Benchmark Scripts Check

**What to check:**
- Benchmark script runs without errors
- Benchmark produces metrics in expected format
- Benchmark is deterministic (or randomness is controlled)

**How to check:**
\`\`\`bash
# Run benchmark on small dataset
python scripts/evaluate.py --config configs/eval.yaml --dataset small_test
\`\`\`

### 3. Training Startup Check (≤100 steps)

**What to check:**
- Training command starts successfully
- Training runs for at least 100 steps without errors
- Loss decreases initially (sanity check)

**How to check:**
\`\`\`bash
# Run training for startup check
python train.py --config configs/train.yaml --max_steps 100
\`\`\`

**Limitation:** At most 100 steps. This is NOT full training - it's just a startup sanity check.

### 4. Baseline Availability Check per Rung

**What to check for each rung in protocol.md:**
- Baseline recipe exists (or train_from_scratch=true)
- If recipe_ref is provided, recipe exists
- If train_from_scratch is false and no recipe exists → baseline unavailable

**How to check:**
\`\`\`bash
# Check if baseline recipe exists
ls mlspec/recipes/<recipe-ref>/recipe.yaml
\`\`\`

---

## Prepare.md Structure

After performing checks, write prepare.md with this structure:

\`\`\`yaml
---
entity_type: prepare
schema: ml-experiment-v3
experiment_id: <experiment-id>
status: ready | needs_work | protocol_change_required
completed: <ISO timestamp>
checks:
  - id: transform-check
    name: Transform Implementation
    status: pass | fail | skip
    notes: <observations>
  - id: benchmark-check
    name: Benchmark Scripts
    status: pass | fail | skip
    notes: <observations>
  - id: startup-check
    name: Training Startup (≤100 steps)
    status: pass | fail | skip
    notes: <observations>
  - id: baseline-availability
    name: Baseline Availability per Rung
    status: pass | fail | skip
    notes: <observations>
blocking_issues:  # Only if status=needs_work
  - type: <issue type>
    location: <file or component>
    description: <what's wrong>
    can_fix_in_prepare: true | false
    suggested_fix: <how to fix>
protocol_issues:  # Only if status=protocol_change_required
  - type: <issue type>
    description: <semantic mismatch>
    recommendation: <how to address>
baseline_availability:
  <rung-id>:
    available: true | false
    source: existing | will_train | unavailable
    recipe_ref: <recipe-id or null>
    notes: <observations>
---
\`\`\`

---

## Status Decision Rules

| Condition | Status |
|-----------|--------|
| All checks pass, baselines available | ready |
| Fixable engineering issues found | needs_work |
| Semantic mismatches detected (intervention/benchmark/metric/data semantics changed) | protocol_change_required |

---

## After Writing prepare.md

1. Run \`mlspec prepare <experiment>\` to validate the artifact
2. If validation fails, fix prepare.md
3. If validation passes, proceed to /mlspec-run

---

## Boundaries

**This skill does:**
- Engineering readiness checks (transform, benchmark, startup, baseline)
- Writing prepare.md with verification results
- Setting status based on check outcomes

**This skill does NOT:**
- Full model training (belongs in evidence collection)
- Empirical comparisons (belongs in evidence collection)
- Change intervention/benchmark/metric/data semantics

---

## Example Session

\`\`\`
User: /mlspec-prepare my-experiment

Agent: Performing engineering readiness checks for my-experiment...

1. Transform Implementation Check
   Running: python -c "from transform import apply_transform; ..."
   Result: PASS - Transform produces correct output shapes

2. Benchmark Scripts Check
   Running: python scripts/evaluate.py --dataset test ...
   Result: PASS - Benchmark produces expected metrics

3. Training Startup Check (≤100 steps)
   Running: python train.py --max_steps 100 ...
   Result: PASS - Training starts successfully, loss decreases

4. Baseline Availability Check
   Checking: pilot rung baseline (recipe: baseline-v1)
   Result: PASS - Baseline recipe exists

Writing prepare.md...
   Status: ready

Next: /mlspec-run my-experiment pilot
\`\`\`
`,
    license: "MIT",
    compatibility: "Requires MLSpec v3 workspace with protocol.md",
    metadata: { author: "mlspec", version: "3.0" },
  };
}

export function getMlspecPrepareCommandTemplate(): CommandTemplate {
  return {
    name: "MLSpec: Prepare",
    description:
      "Perform engineering readiness verification before evidence collection.",
    category: "Workflow",
    tags: ["workflow", "mlspec", "ml", "experiment", "prepare", "readiness"],
    content: `Perform engineering readiness verification.

---

**Checks performed:**
1. Transform implementation (if data_intervention exists)
2. Benchmark scripts functionality
3. Training startup (≤100 steps)
4. Baseline availability per rung

---

**Status:**
- ready: All checks pass, baselines available
- needs_work: Fixable engineering issues found
- protocol_change_required: Semantic mismatches detected

---

**After completion:**
Run \`mlspec prepare <experiment>\` to validate, then /mlspec-run for evidence collection.`,
  };
}